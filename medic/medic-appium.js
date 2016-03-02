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

// Run on iOS device:
// node cordova-medic/medic/medic.js appium --platform ios --device --udid c1e6ec7bb72473cfa14001ad49a2ab7dbbf7d69d --device-name "iPad 2" --platform-version "8.1" --app mobilespec

// Run on iOS emulator:
// node cordova-medic/medic/medic.js appium --platform ios --device-name "iPhone 5" --platform-version "8.4" --app mobilespec

// Run on Android device:
// node cordova-medic/medic/medic.js appium --platform android --device --platform-version "21" --app mobilespec

// Run on Android emulator:
// node cordova-medic/medic/medic.js appium --platform android --device-name appium --platform-version "21" -app mobilespec

var fs              = require("fs");
var path            = require("path");
var util            = require("../lib/util");
var MedicReporter   = require("../lib/MedicReporter");
var optimist        = require("optimist");
var kill            = require("tree-kill");
var child_process   = require("child_process");
var wd              = require("wd");
var et              = require("expect-telnet");
var shell           = require("shelljs");
var Jasmine         = require("jasmine");
var unorm           = require("unorm");

var DEFAULT_APP_PATH = "mobilespec";
var DEFAULT_IOS_DEVICE_NAME = "iPhone 5";
var DEFAULT_ANDROID_DEVICE_NAME = "appium";
var DEFAULT_IOS_PLATFORM_VERSION = "7.1";
var DEFAULT_ANDROID_PLATFORM_VERSION = "19";
var KILL_SIGNAL = "SIGINT";
var APPIUM_IP_ADDRESS = "127.0.0.1";
var APPIUM_PORT = 4723;
var SMALL_BUFFER_SIZE = 1024 * 1024;
var BIG_BUFFER_SIZE = 50 * 1024 * 1024;
var APPIUM_SERVER_PATH = path.normalize("cordova-medic/node_modules/appium/build/lib/main.js");

function getFullAppPath(appPath) {
    return path.join(__dirname, "../..", appPath);
}

function getPackagePath(options) {
    var fullAppPath = getFullAppPath(options.appPath);

    switch (options.platform) {
    case "android":
        return path.join(fullAppPath, "/platforms/android/build/outputs/apk/android-debug.apk");
    case "ios":
        if (options.device) {
            return path.join(fullAppPath, "/platforms/ios/build/device/mobilespec.ipa");
        }
        return path.join(fullAppPath, "/platforms/ios/build/emulator/mobilespec.app");
    }
}

function getLocalPluginDirs() {
    return shell.ls("cordova-plugin-*");
}

function parseArgs() {
    // get args
    var DEFAULT_DEVICE_NAME;
    var DEFAULT_PLATFORM_VERSION;
    var options = {};
    var argv = optimist
            .usage("Usage: $0 {options}")
            .demand("platform")
            .describe("platform", "A platform to run the tests on. Only \'ios\' and \'android\' are supported.")
            .boolean("device")
            .describe("device", "Run tests on real device.")
            .default("app", DEFAULT_APP_PATH)
            .describe("app", "Path to the test app.")
            .default("udid", "")
            .describe("udid", "UDID of the ios device. Only needed when running tests on real iOS devices.")
            .default("deviceName", null)
            .describe("deviceName", "Name of the device to run tests on.")
            .default("platformVersion", null)
            .describe("platformVersion", "Version of the OS installed on the device or the emulator. For example, '21' for Android or '8.1' for iOS.")
            .default("output", path.join(__dirname, "../../test_summary.json"))
            .describe("output", "A file that will store test results")
            .describe("plugins", "A space-separated list of plugins to test.")
            .describe("screenshotPath", "A directory to save screenshots to, either absolute or relative to the directory containing cordova-medic.")
            .argv;

    // filling out the options object
    options.platform = argv.platform.toLowerCase();
    options.appPath  = argv.app;
    options.appiumDeviceName = argv.deviceName || DEFAULT_DEVICE_NAME;
    options.appiumPlatformVersion = argv.platformVersion || DEFAULT_PLATFORM_VERSION;
    options.udid = argv.udid;
    options.device = argv.device;
    options.outputPath = argv.output;
    if (argv.screenshotPath) {
        if (path.isAbsolute(argv.screenshotPath)){
            options.screenshotPath = path.normalize(argv.screenshotPath);
        } else {
            options.screenshotPath = path.join(__dirname, "../..", argv.screenshotPath);
        }
    } else {
        options.screenshotPath = path.join(__dirname, "../../appium_screenshots");
    }

    // accepting both "plugins" or "plugin" arguments
    // if there is none, using default plugin list
    if (argv.plugins) {
        options.pluginRepos = argv.plugins.split(" ");
    } else if (argv.plugin) {
        options.pluginRepos = argv.plugin.split(" ");
    } else {
        options.pluginRepos = getLocalPluginDirs();
    }

    // looking for the tests
    options.testPaths = [];
    options.pluginRepos.forEach(function (pluginRepo) {
        var testPath = path.join(pluginRepo, "appium-tests", options.platform);
        if (fs.existsSync(testPath)) {
            util.medicLog("Found tests in: " + testPath);
            options.testPaths.push(path.join(testPath, "*.spec.js"));
        } else {
            util.medicLog("Couldn't find tests in: " + testPath);
        }
    });

    // setting default values depending of the platform
    switch (options.platform) {
    case "android":
        DEFAULT_DEVICE_NAME = DEFAULT_ANDROID_DEVICE_NAME;
        DEFAULT_PLATFORM_VERSION = DEFAULT_ANDROID_PLATFORM_VERSION;
        break;
    case "ios":
        DEFAULT_DEVICE_NAME = DEFAULT_IOS_DEVICE_NAME;
        DEFAULT_PLATFORM_VERSION = DEFAULT_IOS_PLATFORM_VERSION;
        break;
    default:
        util.fatal("Unsupported platform: " + options.platform);
        break;
    }


    // fail if the user forgot to specify UDID when running on real iOS device
    if (options.platform === "ios" && options.device && !options.udid) {
        util.fatal("Please supply device UDID by using --udid argument when running on real iOS device." +
            "More info on finding out your UDID: https://www.innerfence.com/howto/find-iphone-unique-device-identifier-udid");
    }

    // fail if we couldn't locate the tests
    if (options.testPaths.length === 0) {
        util.fatal("Couldn't find the tests. Please check that the plugin repos are cloned.");
    }

    // setting up the global variables so the tests could use them
    global.WD = wd;
    global.ET = et;
    global.SHELL = shell;
    global.DEVICE = options.device;
    global.PLATFORM_VERSION = options.appiumPlatformVersion;
    global.DEVICE_NAME = options.appiumDeviceName;
    global.SCREENSHOT_PATH = options.screenshotPath;
    if (options.platform === "ios") {
        global.unorm = unorm;
    }
    global.PACKAGE_PATH = getPackagePath(options);

    // creating a directory to save screenshots to
    fs.stat(global.SCREENSHOT_PATH, function (err) {
        if (err) {
            fs.mkdir(global.SCREENSHOT_PATH);
        }
    });

    return options;
}

function getLocalCLI() {
    if (util.isWindows()) {
        return "cordova.bat";
    }
    return "./cordova";
}

// remove medic.json and rebuild the app
function prepareApp(options, callback) {
    var fullAppPath = getFullAppPath(options.appPath);
    var deviceString = options.device ? " --device" : "";
    var buildCommand = getLocalCLI() + " build " + options.platform + deviceString;

    // remove medic.json and (re)build
    shell.rm(path.join(fullAppPath, "www", "medic.json"));
    fs.stat(fullAppPath, function (error, stats) {
        if (error || !stats.isDirectory()) {
            util.fatal("The app directory doesn't exist: " + fullAppPath);
        } else {
            util.medicLog("Building the app...");
            child_process.exec(buildCommand, { cwd: fullAppPath, maxBuffer: SMALL_BUFFER_SIZE }, function (error) {
                if (error) {
                    util.fatal("Couldn't build the app: " + error);
                } else {
                    callback();
                }
            });
        }
    });
}

function isFailFastError(error) {
    if (error && error.message) {
        return error.message.indexOf("Could not find a connected") > -1 ||
            error.message.indexOf("Bad app") > -1;
    }
}

function killProcess(procObj, killSignal, callback) {
    if (procObj.alive) {
        procObj.alive = false;
        setTimeout(function () {
            util.medicLog("Killing ios proxy...");
            kill(procObj.process.pid, killSignal, callback);
        }, 1000);
    } else {
        callback();
    }
}

function saveResults(results, outputPath, callback) {
    if (typeof callback !== "function") {
        callback = function () { return; };
    }
    // write out results if an output path was passed
    if (outputPath) {
        util.medicLog("Saving test run results to " + outputPath);
        fs.writeFile(outputPath, JSON.stringify(results) + "\n", util.DEFAULT_ENCODING, function (error) {
            if (error) {
                util.fatal("Error writing test results: " + error.message);
            } else {
                callback();
            }
        });
    }
}

// TODO: use this function when we get stable Appium results
function summarizeAndSaveResults(results, outputPath, callback) {
    fs.stat(outputPath, function (error, stats) {
        if (!error && stats.isFile()) {
            fs.readFile(outputPath, util.DEFAULT_ENCODING, function (err, data) {
                if (!err) {
                    var obj = JSON.parse(data);
                    util.medicLog("Found autotests results:");
                    if (obj.hasOwnProperty("total")) {
                        util.medicLog("Adding " + results.total + " total from Appium to " + obj.total + " total from autotests");
                        results.total += obj.total;
                    }
                    if (obj.hasOwnProperty("failed")) {
                        util.medicLog("Adding " + results.failed + " failed from Appium to " + obj.failed + " failed from autotests");
                        results.failed += obj.failed;
                    }
                    if (obj.hasOwnProperty("passed")) {
                        util.medicLog("Adding " + results.passed + " passed from Appium to " + obj.passed + " passed from autotests");
                        results.passed += obj.passed;
                    }
                    if (obj.hasOwnProperty("warnings")) {
                        util.medicLog("Adding " + results.warnings + " warnings from Appium to " + obj.warnings + " warnings from autotests");
                        results.warnings += obj.warnings;
                    }
                }
                saveResults(results, callback);
            });
        } else {
            saveResults(results, callback);
        }
    });
}

function startTests(testPaths, appium, iosProxy) {
    var exitCode = 1;
    var jasmine = new Jasmine();
    var medicReporter;

    util.medicLog("Running tests from:");
    testPaths.forEach(function (testPath) {
        util.medicLog(testPath);
    });

    jasmine.loadConfig({
        spec_dir: "",
        spec_files: testPaths
    });

    function allDoneCallback(results) {
        killProcess(appium, KILL_SIGNAL, function () {
            killProcess(iosProxy, KILL_SIGNAL, function () {
                exitCode = results.failed === 0 ? 0 : 1;
                util.medicLog("Exiting with exit code " + exitCode);
                process.exit(exitCode);
            });
        });
    }

    medicReporter = new MedicReporter(allDoneCallback);

    // don't use default reporter, it exits the process before
    // we would get the chance to kill appium server
    //jasmine.configureDefaultReporter({ showColors: false });
    jasmine.addReporter(medicReporter);

    try {
        // Launch the tests!
        jasmine.execute();
    } catch (e) {
        killProcess(appium, KILL_SIGNAL, function () {
            killProcess(iosProxy, KILL_SIGNAL, function () {
                util.fatal("Error running tests:\n" + e.stack);
            });
        });
    }
}

function startIosProxy(options) {
    var iosProxyCommand;
    var iosProxy = {
        alive: false,
        process: null
    };

    if (options.platform === "ios" && options.device && options.udid) {
        iosProxyCommand = "ios_webkit_debug_proxy -c " + options.udid + ":27753";
        util.medicLog("Running:");
        util.medicLog(iosProxyCommand);
        iosProxy.alive = true;
        iosProxy.process = child_process.exec(iosProxyCommand, { maxBuffer: BIG_BUFFER_SIZE }, function () {
            iosProxy.alive = false;
            util.medicLog("iOS proxy process exited.");
        });
    }
    return iosProxy;
}

function startAppiumServer(options, callback) {
    var appiumPlatformName;
    var appiumServerCommand;
    var additionalArgs = "";
    var appium = {
        alive: false,
        process: null
    };

    // compose a command to run the Appium server
    switch (options.platform) {
    case "android":
        appiumPlatformName = "Android";
        if (!options.device) {
            additionalArgs += " --avd " + options.appiumDeviceName;
        }
        break;
    case "ios":
        appiumPlatformName = "iOS";
        if (options.udid) {
            additionalArgs += " --udid " + options.udid;
        }
        break;
    default:
        throw new Error("Unsupported platform: " + options.platform);
    }

    appiumServerCommand = "node " + APPIUM_SERVER_PATH +
        " --address " + APPIUM_IP_ADDRESS +
        " --port " + APPIUM_PORT +
        " --platform-name " + appiumPlatformName +
        " --platform-version " + options.appiumPlatformVersion +
        " --automation-name Appium --log-no-color" +
        " --device-name \"" + options.appiumDeviceName + "\"" +
        additionalArgs;

    // run the Appium server
    util.medicLog("Running:");
    util.medicLog(appiumServerCommand);
    appium.alive = true;
    appium.process = child_process.exec(appiumServerCommand, { maxBuffer: BIG_BUFFER_SIZE }, function (error) {
        util.medicLog("Appium process exited.");
        if (appium.alive && error) {
            util.medicLog("Error running appium server: " + error);
            if (isFailFastError(error)) {
                process.exit(1);
            }
        }
        appium.alive = false;
    });

    // Wait for the Appium server to start up
    appium.process.stdout.on("data", function (data) {
        if (data.indexOf("Appium REST http interface listener started") > -1) {
            callback(appium);
        }
    });
}

function main() {
    var options = parseArgs();

    prepareApp(options, function () {
        var iosProxy = startIosProxy(options);
        startAppiumServer(options, function (appium) {
            startTests(options.testPaths, appium, iosProxy);
        });
    });
}

main();
