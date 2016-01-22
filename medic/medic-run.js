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

var shelljs  = require("shelljs");
var optimist = require("optimist");
var request  = require("request");

var util     = require("../lib/util");
var testwait = require("../lib/testwait");

// constants
var CORDOVA_MEDIC_DIR         = "cordova-medic";
var DEFAULT_APP_PATH          = "mobilespec";
var CORDOVA_ERROR_PATTERN     = /^ERROR/m;
var NO_DEVICE_PATTERN         = /(^.*no .* was detected)|(^.*no devices found)/m;
var DEFAULT_APP_ENTRY         = "index.html";
var ANDROID_PAGE_LOAD_TIMEOUT = 120000; // in milliseconds
var MEDIC_BUILD_PREFIX        = "medic-cli-build";
var DEFAULT_WINDOWS_VERSION   = "store";
var WINDOWS_VERSION_CHOICES   = ["store", "store80", "phone"];
var DEFAULT_TIMEOUT           = 600; // in seconds
var SERVER_RESPONSE_TIMEOUT   = 15000; // in milliseconds
var MAX_NUMBER_OF_TRIES       = 3;
var WAIT_TIME_FOR_CORDOVA_VM  = 15000; // in milliseconds

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
    if (winVersion === "store80") {
        setWindowsTargetStoreVersion(appPath, "8.0");
        extraArgs = "--win";

    } else if (winVersion === "store") {
        setWindowsTargetStoreVersion(appPath, "8.1");
        extraArgs = "--win";

    } else if (winVersion === "phone") {
        setWindowsTargetStoreVersion(appPath, "8.1");
        extraArgs = "--phone";
    }

    // patch WindowsStoreAppUtils script to allow app run w/out active desktop/remote session
    if (winVersion === "store80" || winVersion === "store") {

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

function wp8SpecificPreparation(argv) {

    var appPath = argv.app;

    // set permanent guid to prevent multiple installations
    var guid         = "{8449DEEE-16EB-4A4A-AFCC-8446E8F06FF7}";
    var manifestPath = path.join(appPath, "platforms", "wp8", "Properties", "WMAppManifest.xml");
    var xml          = fs.readFileSync(manifestPath).toString().split("\n");

    for (var i in xml) if (xml[i].indexOf("<App") != -1) {
        if (xml[i].toLowerCase().indexOf("productid") != -1) {
            var index = xml[i].toLowerCase().indexOf("productid");
            var spaceIndex = xml[i].indexOf(" ", index);
            var stringAsArray = xml[i].split("");
            stringAsArray.splice(index, spaceIndex - index);
            xml[i] = stringAsArray.join("");
        }
        xml[i] = xml[i].substr(0, xml[i].length - 1);
        xml[i] += " ProductID=\"" + guid + "\">";
        break;
    }

    fs.writeFileSync(manifestPath, xml.join("\n"));

    var extraArgs = "";
    return extraArgs;
}

function getLocalCLI() {
    if (util.isWindows()) {
        return "cordova.bat";
    } else {
        return "./cordova";
    }
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
    }).on('response', function (response){
        callback();
    }).on('error', function (error){
        if(pendingNumberOfTries > 1) {
            util.medicLog("it's not up. Going to retry after " + WAIT_TIME_FOR_CORDOVA_VM + " milliseconds");
            setTimeout(function (){
                tryConnect(couchdbURI, pendingNumberOfTries-1 , callback);
            }, WAIT_TIME_FOR_CORDOVA_VM);
        } else {
            util.fatal("it's not up even after " + MAX_NUMBER_OF_TRIES + " attempts to connect, so test run can't be monitored");
            process.exit(1);
        }
    });
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
        .argv;

    var platform   = argv.platform;
    var buildId    = argv.id;
    var appPath    = argv.app;
    var couchdbURI = argv.couchdb;
    var entryPoint = argv.entry;
    var timeout    = argv.timeout;

    var cli = getLocalCLI();

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
        } else if (platform === util.WP8) {
            platformArgs = wp8SpecificPreparation(argv);
        }

        // start waiting for test results
        // NOTE:
        //      timeout needs to be in milliseconds, but it's
        //      given in seconds, so we multiply by 1000
        testwait.init(couchdbURI);
        testwait.waitTestsCompleted(buildId, timeout * 1000).then(
            function onFulfilled(value) {
                util.medicLog("got test results");
                process.exit(0);
            },
            function onRejected(error) {
                console.error("didn't get test results: " + error);
                process.exit(1);
            }
        );
        util.medicLog("started waiting for test results");

        // enter the app directory
        util.medicLog("moving into " + appPath);
        shelljs.pushd(appPath);

        // compose commands
        var buildCommand       = cli + " build " + platform + " -- " + platformArgs;
        var runCommandEmulator = cli + " run --emulator " + platform + " -- " + platformArgs;
        var runCommandDevice   = cli + " run --device " + platform + " -- " + platformArgs;

        // build the code
        // NOTE:
        //      this is SYNCHRONOUS
        util.medicLog("running:");
        util.medicLog("    " + buildCommand);
        var result = shelljs.exec(buildCommand, {silent: false, async: false});
        if (cordovaReturnedError(result.code, result.output)) {
            util.fatal("build failed");
        }

        // run the code
        // NOTE:
        //      this is ASYNCHRONOUS
        util.medicLog("running:");
        util.medicLog("    " + runCommandDevice);
        shelljs.exec(runCommandDevice, {silent: false, async: true}, function (returnCode, output) {
            if (failedBecauseNoDevice(output)) {
                util.medicLog("no device found, so switching to emulator");
                util.medicLog("running:");
                util.medicLog("    " + runCommandEmulator);
                shelljs.exec(runCommandEmulator, {silent: false, async: true}, function (returnCode, output) {
                    if (cordovaReturnedError(returnCode, output)) {
                        util.fatal("running on emulator failed");
                    }
                });
            } else {
                if (cordovaReturnedError(returnCode, output)) {
                    util.fatal("running on device failed");
                }
            }
        });
    });
}

main();
