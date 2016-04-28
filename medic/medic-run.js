#!/usr/bin/env node

/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/* jshint node: true */

"use strict";

var fs   = require("fs");
var path = require("path");
var child_process = require("child_process");

var shelljs  = require("shelljs");
var optimist = require("optimist");
var request  = require("request");

var util     = require("../lib/util");
var testwait = require("../lib/testwait");
var MedicIOSPermissions = require("../lib/medicIOSPermissions");

// constants
var CORDOVA_MEDIC_DIR         = "cordova-medic";
var DEFAULT_APP_PATH          = "mobilespec";
var CORDOVA_ERROR_PATTERN     = /^ERROR/m;
var NO_DEVICE_PATTERN         = /(^.*no .* was detected)|(^.*no devices found)/m;
var DEFAULT_APP_ENTRY         = "index.html";
var ANDROID_PAGE_LOAD_TIMEOUT = 120000; // in milliseconds
var MEDIC_BUILD_PREFIX        = "medic-cli-build";
var DEFAULT_WINDOWS_VERSION   = "store";
var WINDOWS_VERSION_CHOICES   = ["store", "phone"];
var DEFAULT_TIMEOUT           = 600; // in seconds
var SERVER_RESPONSE_TIMEOUT   = 15000; // in milliseconds
var MAX_NUMBER_OF_TRIES       = 3;
var WAIT_TIME_TO_RETRY_CONNECTION  = 15000; // in milliseconds

// Used to grant appropriate iOS permissions
var IOS_APPS_TO_GRANT_PERMISSIONS = ['kTCCServiceAddressBook'];
var IOS_SIM_FOLDER = "/Users/buildbot/Library/Developer/CoreSimulator/Devices/";
var IOS_TCC_DB_FOLDER = "/Users/buildbot/Library/Application\ Support/com.apple.TCC/";

// helpers
function currentMillisecond() {
    return new Date().valueOf();
}

function generateBuildID() {
    var components = [MEDIC_BUILD_PREFIX, currentMillisecond()];
    return components.join("-");
}

function getConfigPath(appPath) {
    return path.join(appPath, "config.xml");
}

function getCSPPath(appPath) {
    return path.join(appPath, "www", "csp-incl.js");
}

function createMedicJson(appPath, buildId, couchdbURI) {

    util.medicLog("Writing medic.json to " + appPath);
    util.medicLog("    sha:     " + buildId);
    util.medicLog("    couchdb: " + couchdbURI);

    // NOTE:
    //      the "sha" name is a misnomer, but is kept
    //      to be compatible with plugin-test-framework
    var medicConfig = {
        sha:     buildId,
        couchdb: couchdbURI
    };

    var medicConfigContents = JSON.stringify(medicConfig) + "\n";
    var medicConfigPath     = path.join(appPath, "www", "medic.json");

    fs.writeFileSync(medicConfigPath, medicConfigContents, util.DEFAULT_ENCODING);
}

function addURIToWhitelist(appPath, uri) {

    var configFile = getConfigPath(appPath);
    var cspFile    = getCSPPath(appPath);

    var configContent = fs.readFileSync(configFile, util.DEFAULT_ENCODING);
    var cspContent    = fs.readFileSync(cspFile, util.DEFAULT_ENCODING);

    // add whitelisting rule allow access to couch server
    util.medicLog("Adding whitelist rule for CouchDB host: " + uri);
    var accessOriginTag = "<access origin=\"" + uri + "\" />";
    if (!util.contains(configContent, accessOriginTag)) {
        configContent = configContent.split("</widget>").join("");
        configContent += "    " + accessOriginTag + "\n</widget>\n";
        fs.writeFileSync(configFile, configContent, util.DEFAULT_ENCODING);
    }

    // add couchdb address to csp rules
    util.medicLog("Adding CSP rule for CouchDB host: " + uri);
    var cspRule = "connect-src " + uri;
    if (!util.contains(cspContent, cspRule)) {
        cspContent = cspContent.replace("connect-src", cspRule);
        fs.writeFileSync(cspFile, cspContent, util.DEFAULT_ENCODING);
    }
}

function setEntryPoint(appPath, entryPoint) {

    var configFile = getConfigPath(appPath);
    var configContent = fs.readFileSync(configFile, util.DEFAULT_ENCODING);

    // replace/add start page preference
    // check if config.xml already contains <content /> element
    util.medicLog("Setting entry point to " + entryPoint + " in config.xml");

    if (configContent.match(/<content\s*src=".*"\s*\/>/gi)) {
        configContent = configContent.replace(
            /<content\s*src=".*"\s*\/>/gi,
            "<content src=\"" + entryPoint + "\" />"
        );

    } else {

        // add entry point to config
        configContent = configContent.split("</widget>").join("") +
            "    <content src=\"" + entryPoint + "\" />\n</widget>";
    }

    // write the changes
    fs.writeFileSync(configFile, configContent, util.DEFAULT_ENCODING);
}

function changeAndroidLoadTimeout(appPath, timeout) {

    util.medicLog("Increasing url loading timeout for android to " + timeout);

    var timeoutRegex           = /<preference\s*name\s *= \s*"?loadUrlTimeoutValue"?.*?((\/>)|(>.*?<\/\s*preference>))/i;
    var timeoutTag             = "<preference name=\"loadUrlTimeoutValue\" value=\"" + timeout + "\" />";
    var timeoutTagWithPlatform = "    <platform name=\"android\">\n        <preference name=\"loadUrlTimeoutValue\" value=\"120000\" />\n    </platform>\n";
    var platformRegex          = /<platform\s*name\s *= \s*"android"\s*>/i;
    var widgetRegex            = /<\/s*widget\s*>/i;

    var configFile    = getConfigPath(appPath);
    var configContent = fs.readFileSync(configFile, util.DEFAULT_ENCODING);

    if (timeoutRegex.test(configContent)) {
        configContent = configContent.replace(timeoutRegex, timeoutTag);
        util.medicLog("Found \"loadUrlTimeoutValue\" preference, replacing with desired value");
    } else if (platformRegex.test(configContent)) {
        var oldPlatformTag = platformRegex.exec(configContent)[0];
        configContent = configContent.replace(platformRegex, oldPlatformTag + "\n        " + timeoutTag);
        util.medicLog("Found platform tag, appending \"loadUrlTimeoutValue\" preference");
    } else if (widgetRegex.test(configContent)) {
        var oldWidgetTag = widgetRegex.exec(configContent)[0];
        configContent = configContent.replace(widgetRegex, timeoutTagWithPlatform + oldWidgetTag);
        util.medicLog("Did not find platform tag, adding preference with platform tag");
    } else {
        util.medicLog("Warning: could not modify config.xml for android: no <widget> tag found!");
    }

    // write the changes
    fs.writeFileSync(configFile, configContent, util.DEFAULT_ENCODING);
}

function setWindowsTargetStoreVersion(appPath, version) {

    util.medicLog("setting target store version to " + version);

    var configFile    = getConfigPath(appPath);
    var configContent = fs.readFileSync(configFile, util.DEFAULT_ENCODING);

    var versionPreference = "    <preference name=\"windows-target-version\" value=\"" + version + "\" />";
    configContent = configContent.replace("</widget>", versionPreference + "\r\n</widget>");

    fs.writeFileSync(configFile, configContent, "utf8");
}

function androidSpecificPreparation(argv) {

    var appPath   = argv.app;
    var extraArgs = "--gradle";

    changeAndroidLoadTimeout(appPath, ANDROID_PAGE_LOAD_TIMEOUT);

    return extraArgs;
}

function windowsSpecificPreparation(argv) {

    var appPath    = argv.app;
    var winVersion = argv.winvers;
    var extraArgs  = "";

    if (!util.contains(WINDOWS_VERSION_CHOICES, winVersion)) {
        util.fatal("invalid windows version: " + winVersion);
    }

    // set windows target store version
    if (winVersion === "store") {
        setWindowsTargetStoreVersion(appPath, "8.1");
        extraArgs = "--win";

    } else if (winVersion === "phone") {
        setWindowsTargetStoreVersion(appPath, "8.1");
        extraArgs = "--phone";
    }

    // patch WindowsStoreAppUtils script to allow app run w/out active desktop/remote session
    if (winVersion === "store") {

        util.medicLog("Patching WindowsStoreAppUtils to allow app to be run in automated mode");

        var platformPath   = path.join(appPath, "platforms", "windows");
        var libPath        = path.join(platformPath, "cordova", "lib");
        var appUtilsPath   = path.join(libPath, "WindowsStoreAppUtils.ps1");
        var srcScriptPath  = path.join(CORDOVA_MEDIC_DIR, "lib", "patches", "EnableDebuggingForPackage.ps1");
        var destScriptPath = path.join(libPath, "EnableDebuggingForPackage.ps1");

        // copy over the patch
        shelljs.cp("-f", srcScriptPath, libPath);

        // add extra code to patch
        shelljs.sed(
            "-i",
            /^\s*\$appActivator .*$/gim,
            "$&\n" +
            "    powershell " + path.join(process.cwd(), destScriptPath) + " $$ID\n" +
            "    $Ole32 = Add-Type -MemberDefinition '[DllImport(\"Ole32.dll\")]public static extern int CoAllowSetForegroundWindow(IntPtr pUnk, IntPtr lpvReserved);' -Name 'Ole32' -Namespace 'Win32' -PassThru\n" +
            "    $Ole32::CoAllowSetForegroundWindow([System.Runtime.InteropServices.Marshal]::GetIUnknownForObject($appActivator), [System.IntPtr]::Zero)",
            appUtilsPath
        );
    }

    return extraArgs;
}

function iOSSpecificPreparation(argv) {
    var extraArgs = "";

    util.medicLog("Granting iOS permissions: ");

    var appName = 'org.apache.mobilespec';
    var simulatorsFolder = argv.simulatorsFolder;
    var tccDbPath = argv.tccDbPath;

    if(appName && simulatorsFolder && tccDbPath) {
        var medicPerms = new MedicIOSPermissions(appName, simulatorsFolder, tccDbPath);
        medicPerms.updatePermissions(IOS_APPS_TO_GRANT_PERMISSIONS);
    }

    return extraArgs;
}

function cordovaReturnedError(returnCode, output) {
    if (returnCode !== 0 || CORDOVA_ERROR_PATTERN.test(output)) {
        return true;
    }
    return false;
}

function failedBecauseNoDevice(output) {
    return NO_DEVICE_PATTERN.test(output);
}

function tryConnect(couchdbURI, pendingNumberOfTries, callback) {
    util.medicLog("checking if " + couchdbURI + " is up.");

    // check if results server is up
    request({
        uri:     couchdbURI,
        method:  "GET",
        timeout: SERVER_RESPONSE_TIMEOUT
    }, function (error, response, body){
        if(error) {
            if(pendingNumberOfTries > 1) {
                util.medicLog("it's not up. Going to retry after " + WAIT_TIME_TO_RETRY_CONNECTION + " milliseconds");
                setTimeout(function (){
                    tryConnect(couchdbURI, pendingNumberOfTries-1 , callback);
                }, WAIT_TIME_TO_RETRY_CONNECTION);
            } else {
                util.fatal("it's not up even after " + MAX_NUMBER_OF_TRIES + " attempts to connect, so test run can't be monitored");
                process.exit(1);
            }
        }
        else {
            callback();
        }
    });
}

/* Starts periodic polling to check for the mobilespec test results in CouchDB.
 * After it finishes polling, it will terminate the process returning a 0 if
 * results were found or 1 if they were not.
 *
 * @param {string} couchdbURI   The URL for the couchdb instance
 * @param {string} buildId      The build ID to query the coudchdb for
 * @param {number} timeout      The amount of time in seconds to continue polling
 */
function startPollingForTestResults(couchdbURI, buildId, timeout) {
    testwait.init(couchdbURI);

    // NOTE:
    //      timeout needs to be in milliseconds, but it's
    //      given in seconds, so we multiply by 1000
    testwait.waitTestsCompleted(buildId, timeout * 1000, false).then(
        function onFulfilled(value) {
            util.medicLog("Successfully found test results");
            process.exit(0);
        },
        function onRejected(error) {
            util.fatal("Could not find test results. Check the output of medic-log to see if the app crashed before it could upload them to couchdb.");
        }
    );
    util.medicLog("started waiting for test results");
}

// main
function main() {

    // shell config
    shelljs.config.fatal  = false;
    shelljs.config.silent = false;

    // get args
    var argv = optimist
        .usage("Usage: $0 {options}")
        .demand("platform")
        .demand("couchdb")
        .default("entry", DEFAULT_APP_ENTRY)
        .default("id", generateBuildID())
        .default("app", DEFAULT_APP_PATH)
        .default("timeout", DEFAULT_TIMEOUT).describe("timeout", "timeout in seconds")
        .default("winvers", DEFAULT_WINDOWS_VERSION).describe("winvers", "[" + WINDOWS_VERSION_CHOICES.join("|") + "]")
        .default("simulatorsFolder", IOS_SIM_FOLDER)
        .default("tccDbPath", IOS_TCC_DB_FOLDER)
        .argv;

    var platform   = argv.platform;
    var buildId    = argv.id;
    var appPath    = argv.app;
    var couchdbURI = argv.couchdb;
    var entryPoint = argv.entry;
    var timeout    = argv.timeout;

    var workingDir = process.cwd();

    var cli = util.getLocalCLI();

    // check that the app exists
    if (!fs.existsSync(appPath)) {
        util.fatal("app " + appPath + " does not exist");
    }

    tryConnect(couchdbURI, MAX_NUMBER_OF_TRIES, function (){
        util.medicLog("it's up");

        // modify the app to run autonomously
        createMedicJson(appPath, buildId, couchdbURI);
        setEntryPoint(appPath, entryPoint);
        addURIToWhitelist(appPath, couchdbURI);

        // do platform-specific preparations
        var platformArgs = "";
        if (platform === util.ANDROID) {
            platformArgs = androidSpecificPreparation(argv);
        } else if (platform === util.WINDOWS) {
            platformArgs = windowsSpecificPreparation(argv);
        } else if (platform === util.IOS) {
            // Note: (hack) we need to be in a cordova project before we can run iOS specific preparations
            shelljs.pushd(appPath);
            platformArgs = iOSSpecificPreparation(argv);
            shelljs.popd(appPath);
        }

        // enter the app directory
        util.medicLog("moving into " + appPath);
        shelljs.pushd(appPath);

        // compose commands
        var buildCommand       = cli + " build " + platform + " -- " + platformArgs;
        var runCommandEmulator = cli + " run --emulator " + platform + " -- " + platformArgs;
        var runCommandDevice   = cli + " run --device " + platform + " -- " + platformArgs;

        // build the code
        util.medicLog("running:");
        util.medicLog("    " + buildCommand);
        var result = shelljs.exec(buildCommand, {silent: false, async: false});
        if (cordovaReturnedError(result.code, result.output)) {
            util.fatal("build failed");
        }

        // run the code
        util.medicLog("running:");
        util.medicLog("    " + runCommandDevice);
        var runDeviceResult = shelljs.exec(runCommandDevice, {silent: false, async: false});

        if (failedBecauseNoDevice(runDeviceResult.output)) {
            util.medicLog("no device found, so switching to emulator");

            // Because the Android emulator is started separately, we need to
            // abstract the run step into a function
            var runOnEmulator = function() {
                util.medicLog("running:");
                util.medicLog("    " + runCommandEmulator);

                var runEmulatorResult = shelljs.exec(runCommandEmulator, {silent: false, async: false});
                if (cordovaReturnedError(runEmulatorResult.code, runEmulatorResult.output)) {
                    util.fatal("running on emulator failed");
                } else {
                    startPollingForTestResults(couchdbURI, buildId, timeout);
                }
            };

            if (platform === util.ANDROID) {
                // We need to start the emulator first. We can't use "cordova run"
                // because sometimes the Android emulator hangs on Windows
                // (CB-10510). Buildbot doesn't like the child process that the
                // emulator script launches because of how it sets stdio to
                // "inherit". For that reason, we need to spawn a separate
                // process and factor it out into a separate script.
                // See https://nodejs.org/api/child_process.html#child_process_options_detached
                util.medicLog("Attempting to start Android emulator");

                var startEmuScript = path.resolve(__dirname, "..", "lib", "start-android-emulator.js");
                var absoluteAppPath = path.isAbsolute(appPath) ? appPath : path.resolve(workingDir, appPath);

                var startEmuResult = child_process.spawnSync("node", [startEmuScript, "--app", absoluteAppPath], {stdio: "ignore"});

                if (startEmuResult.status > 0) {
                    util.fatal("Could not start Android emulator");
                } else {
                    util.medicLog("Android emulator started");

                    // CB-10699: We try to uninstall the app once the emulator
                    // boots up, because sometimes the adb command that "cordova
                    // run" uses fails to uninstall the app and errors out

                    // There needs to be only one device for uninstall to work
                    var numDevices = util.countAndroidDevices();
                    if (numDevices != 1) {
                        util.medicLog("WARNING: There is more than one device/emulator attached, skipping uninstall step");
                    } else {
                        var uninstallCommand = "adb uninstall org.apache.mobilespec";

                        util.medicLog("Running the following command:");
                        util.medicLog("    " + uninstallCommand);

                        // This command will fail if the app is not installed,
                        // so we set it to silent so as to not confuse anyone
                        var uninstallResult = shelljs.exec(uninstallCommand, {silent: true, async: false});
                    }

                    runOnEmulator();
                }
            } else {
                runOnEmulator();
            }
        } else if (cordovaReturnedError(runDeviceResult.code, runDeviceResult.output)) {
            util.fatal("running on device failed");
        } else {
            util.medicLog("Finished waiting for run command");
            startPollingForTestResults(couchdbURI, buildId, timeout);
        }
    });
}

main();
