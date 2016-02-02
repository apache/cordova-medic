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
/*jslint node: true, stupid: true, nomen: true, plusplus: true*/
/*global jasmine*/

'use strict';

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
var optimist        = require("optimist");
var kill            = require("tree-kill");
var cp              = require("child_process");
var wd              = require("wd");
var et              = require("expect-telnet");
var shell           = require("shelljs");
var Jasmine         = require("jasmine");

var DEFAULT_APP_PATH = "mobilespec";
var DEFAULT_IOS_DEVICE_NAME = "iPhone 5";
var DEFAULT_ANDROID_DEVICE_NAME = "appium";
var DEFAULT_IOS_PLATFORM_VERSION = "7.1";
var DEFAULT_ANDROID_PLATFORM_VERSION = "19";

var appiumAlive = false;
var iosProxyAlive = false;
var platform;
var appPath;
var testPaths = [];
var appiumProcess;
var iosProxyProcess;
var udid;
var appiumDeviceName;
var appiumPlatformVersion;
var device;
var outputPath;
var failedSpecs = [];
var pendingSpecs = [];
var results = {
    total: 0,
    failed: 0,
    passed: 0,
    warnings: 0
};
var pluginRepos = [
    "cordova-plugin-battery-status",
    "cordova-plugin-camera",
    "cordova-plugin-console",
    "cordova-plugin-contacts",
    "cordova-plugin-device",
    "cordova-plugin-device-motion",
    "cordova-plugin-device-orientation",
    "cordova-plugin-dialogs",
    "cordova-plugin-file",
    "cordova-plugin-file-transfer",
    "cordova-plugin-geolocation",
    "cordova-plugin-globalization",
    "cordova-plugin-inappbrowser",
    "cordova-plugin-media",
    "cordova-plugin-media-capture",
    "cordova-plugin-network-information",
    "cordova-plugin-splashscreen",
    "cordova-plugin-statusbar",
    "cordova-plugin-vibration",
    "cordova-plugin-whitelist",
];

function parseArgs() {
    // get args
    var DEFAULT_DEVICE_NAME,
        DEFAULT_PLATFORM_VERSION,
        argv = optimist
            .usage("Usage: $0 {options}")
            .demand("platform")
            .describe("platform", "A platform to run the tests on. Only \'ios\' and \'android\' are supported.")
            .boolean("device")
            .describe("device", "Run tests on real device.")
            .default("app", DEFAULT_APP_PATH)
            .describe("app", "Path to the test app.")
            .default("udid", "")
            .describe("udid", "UDID of the ios device. Only needed when running tests on real iOS devices.")
            .default("device-name", null)
            .describe("device-name", "Name of the device to run tests on.")
            .default("platform-version", null)
            .describe("platform-version", "Version of the OS installed on the device or the emulator. For example, '21' for Android or '8.1' for iOS.")
            .default("output", path.join(__dirname, "../../test_summary.json"))
            .describe("output", "A file that will store test results")
            .describe("plugins", "A space-separated list of plugins to test.")
            .argv;

    platform = argv.platform.toLowerCase();
    appPath  = argv.app;
    global.WD = wd;
    global.ET = et;
    global.SHELL = shell;
    global.SCREENSHOT_PATH = path.join(__dirname, "../../appium_screenshots_" + (argv["build-id"] || "noid")) + "/";
    fs.stat(global.SCREENSHOT_PATH, function (err) {
        if (err) {
            fs.mkdir(global.SCREENSHOT_PATH);
        }
    });
    if (argv.plugins) {
        pluginRepos = argv.plugins.split(" ");
    } else if (argv.plugin) {
        pluginRepos = argv.plugin.split(" ");
    }
    pluginRepos.forEach(function (pluginRepo) {
        var testPath = path.join(pluginRepo, "appium-tests", platform);
        if (fs.existsSync(testPath)) {
            util.medicLog("Found tests in: " + testPath);
            testPaths.push(path.join(testPath, "*.spec.js"));
        } else {
            util.medicLog("Couldn't find tests in: " + testPath);
        }
    });
    if (testPaths.length === 0) {
        util.fatal("Couldn't find the tests. Please check that the plugin repos are cloned.");
    }
    switch (platform) {
    case "android":
        DEFAULT_DEVICE_NAME = DEFAULT_ANDROID_DEVICE_NAME;
        DEFAULT_PLATFORM_VERSION = DEFAULT_ANDROID_PLATFORM_VERSION;
        break;
    case "ios":
        DEFAULT_DEVICE_NAME = DEFAULT_IOS_DEVICE_NAME;
        DEFAULT_PLATFORM_VERSION = DEFAULT_IOS_PLATFORM_VERSION;
        global.unorm = require('unorm');
        break;
    default:
        util.fatal("Unsupported platform: " + platform);
        break;
    }
    appiumDeviceName = argv["device-name"] || DEFAULT_DEVICE_NAME;
    global.DEVICE_NAME = appiumDeviceName;
    appiumPlatformVersion = argv["platform-version"] || DEFAULT_PLATFORM_VERSION;
    global.PLATFORM_VERSION = appiumPlatformVersion;
    udid = argv.udid;
    device = argv.device;
    global.DEVICE = device;
    outputPath = argv.output;
    if (platform === "ios" && device && !udid) {
        util.fatal("Please supply device UDID by using --udid argument when running on real iOS device." +
            "More info on finding out your UDID: https://www.innerfence.com/howto/find-iphone-unique-device-identifier-udid");
    }
}

// Save the app package path for tests to use
function setPackagePath(callback) {
    var appFullPath = path.join(__dirname, "../..", appPath),
        deviceString = device ? " --device" : "",
        buildCommand = "cordova build " + platform + deviceString;

    // remove medic.json and (re)build
    shell.rm(path.join(appFullPath, "www", "medic.json"));
    util.medicLog("Building the app...");
    cp.exec(buildCommand, { cwd: appFullPath, maxBuffer: 1024 * 1024 }, function (error) {
        if (error) {
            util.fatal("Couldn't build the app: " + error);
        } else {
            callback();
        }
    });

    switch (platform) {
    case "android":
        global.PACKAGE_PATH = path.join(appFullPath, "/platforms/android/build/outputs/apk/android-debug.apk");
        break;
    case "ios":
        if (device) {
            global.PACKAGE_PATH = path.join(appFullPath, "/platforms/ios/build/device/mobilespec.ipa");
        } else {
            global.PACKAGE_PATH = path.join(appFullPath, "/platforms/ios/build/emulator/mobilespec.app");
        }
        break;
    }
}

function isFailFastError(error) {
    if (error && error.message) {
        return error.message.indexOf("Could not find a connected") > -1 ||
            error.message.indexOf("Bad app") > -1;
    }
}

function killIosProxy(callback) {
    if (iosProxyAlive) {
        iosProxyAlive = false;
        setTimeout(function () {
            util.medicLog("Killing ios proxy...");
            kill(iosProxyProcess.pid, "SIGINT", callback);
        }, 1000);
    } else {
        callback();
    }
}

function killAppium(callback) {
    if (appiumAlive) {
        appiumAlive = false;
        setTimeout(function () {
            util.medicLog("Killing appium server...");
            kill(appiumProcess.pid, "SIGINT", callback);
        }, 1000);
    } else {
        callback();
    }
}

function saveResults(results, callback) {
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

function summarizeAndSaveResults(callback) {
    fs.stat(outputPath, function (error, stats) {
        if (!error && stats.isFile()) {
            fs.readFile(outputPath, util.DEFAULT_ENCODING, function (err, data) {
                if (!err) {
                    var obj = JSON.parse(data);
                    util.medicLog('Found autotests results:');
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


function plural(str, count) {
    return count === 1 ? str : str + 's';
}

function repeat(thing, times) {
    var arr = [], i;
    for (i = 0; i < times; i++) {
        arr.push(thing);
    }
    return arr;
}

function indent(str, spaces) {
    var lines = (str || '').split('\n'),
        newArr = [],
        i;
    for (i = 0; i < lines.length; i++) {
        newArr.push(repeat(' ', spaces).join('') + lines[i]);
    }
    return newArr.join('\n');
}

function specFailureDetails(result, failedSpecNumber) {
    var i, failedExpectation;

    console.log(failedSpecNumber + ') ');
    console.log(result.fullName);

    for (i = 0; i < result.failedExpectations.length; i++) {
        failedExpectation = result.failedExpectations[i];
        console.log(indent('Message:', 2));
        console.log(failedExpectation.message);
        console.log(indent('Stack:', 2));
        console.log(indent(failedExpectation.stack, 4));
    }
}

function pendingSpecDetails(result, pendingSpecNumber) {
    console.log(pendingSpecNumber + ') ');
    console.log(result.fullName);
    var pendingReason = "No reason given";
    if (result.pendingReason && result.pendingReason !== '') {
        pendingReason = result.pendingReason;
    }
    console.log(indent(pendingReason, 2));
}

function reportResults() {
    var i, specCounts;

    if (failedSpecs.length > 0) {
        console.log('Failures:');
    }
    for (i = 0; i < failedSpecs.length; i++) {
        specFailureDetails(failedSpecs[i], i + 1);
    }

    if (pendingSpecs.length > 0) {
        console.log("Pending:");
    }
    for (i = 0; i < pendingSpecs.length; i++) {
        pendingSpecDetails(pendingSpecs[i], i + 1);
    }

    if (results.total > 0) {
        specCounts = results.total + ' ' + plural('spec', results.total) + ', ' +
            results.failed + ' ' + plural('failure', results.failed);

        if (pendingSpecs.length) {
            specCounts += ', ' + pendingSpecs.length + ' pending ' + plural('spec', pendingSpecs.length);
        }

        console.log(specCounts);
    } else {
        console.log('No specs found');
    }
}

function startTests() {
    var exitCode = 1,
        offset = "    ",
        jasmine = new Jasmine(),
        medicReporter;

    util.medicLog("Running tests from:");
    testPaths.forEach(function (testPath) {
        util.medicLog(testPath);
    });

    jasmine.loadConfig({
        spec_dir: "",
        spec_files: testPaths
    });

    medicReporter = {
        specStarted: function (spec) {
            util.medicLog("Starting new spec: " + spec.description);
        },
        suiteDone: function (suite) {
            var i;
            util.medicLog('Suite done: ' + suite.description);
            util.medicLog('Result was: ' + suite.status);
            for (i = 0; i < suite.failedExpectations.length; i++) {
                util.medicLog(suite.failedExpectations[i].message);
                util.medicLog(offset + suite.failedExpectations[i].stack.replace(/(\r\n|\n|\r)/gm, "\n" + offset));
            }
        },
        specDone: function (spec) {
            util.medicLog("Spec " + spec.status + ": " + spec.description);
            results.total++;
            if (spec.status === "failed") {
                failedSpecs.push(spec);
                results.failed++;
            } else if (spec.status === "pending") {
                pendingSpecs.push(spec);
                results.warnings++;
            } else {
                results.passed++;
            }
        },
        jasmineDone: function () {
            reportResults();
            killAppium(function () {
                exitCode = failedSpecs.length === 0 ? 0 : 1;
                // reporting results to buildbot is disabled
                // until we get the desired stability of tests
                //summarizeAndSaveResults(function () {
                    util.medicLog("Exiting with exit code " + exitCode);
                    process.exit(exitCode);
                //});
            });
        }
    };

    // don't use default reporter, it exits the process before
    // we would get the chance to kill appium server
    //jasmine.configureDefaultReporter({ showColors: false });
    jasmine.addReporter(medicReporter);

    try {
        // Launch the tests!
        jasmine.execute();
    } catch (e) {
        killAppium(function () {
            util.fatal("Error running tests:\n" + e.stack);
        });
    }
}

function startAppiumServer() {
    var appiumPlatformName,
        appiumServerCommand,
        avdString = "",
        udidString = "",
        iosProxyCommand;
    switch (platform) {
    case "android":
        appiumPlatformName = "Android";
        if (!device) {
            avdString = " --avd " + appiumDeviceName;
        }
        appiumServerCommand = "node cordova-medic/node_modules/appium/bin/appium.js " +
            "--address 127.0.0.1 " +
            "--port 4723 " +
            " --platform-name " + appiumPlatformName +
            " --platform-version " + appiumPlatformVersion +
            " --automation-name Appium --log-no-color" +
            avdString +
            " --device-name \"" + appiumDeviceName + "\"";
        break;
    case "ios":
        appiumPlatformName = "iOS";
        if (udid) {
            udidString = " --udid " + udid;
        }
        appiumServerCommand = "node cordova-medic/node_modules/appium/bin/appium.js " +
            "--address 127.0.0.1 " +
            "--port 4723 " +
            " --platform-name " + appiumPlatformName +
            " --automation-name Appium --log-no-color" +
            " --device-name \"" + appiumDeviceName + "\"" +
            udidString;
        break;
    default:
        throw new Error("Unsupported platform: " + platform);
    }

    // run iOS proxy
    if (platform === "ios" && device && udid) {
        iosProxyCommand = "ios_webkit_debug_proxy -c " + udid + ":27753";
        util.medicLog("Running:");
        util.medicLog(iosProxyCommand);
        iosProxyAlive = true;
        iosProxyProcess = cp.exec(iosProxyCommand, { maxBuffer: 1024 * 1024 }, function () {
            util.medicLog("iOS proxy process exited.");
        });
    }

    // run appium server
    util.medicLog("Running:");
    util.medicLog(appiumServerCommand);
    appiumAlive = true;
    appiumProcess = cp.exec(appiumServerCommand, { maxBuffer: 50 * 1024 * 1024 }, function (error) {
        util.medicLog("Appium process exited.");
        if (appiumAlive && error) {
            util.medicLog('Error running appium server: ' + error);
            if (isFailFastError(error)) {
                process.exit(1);
            }
        }
        appiumAlive = false;
    });

    // Wait for appium server to start up, then start tests
    appiumProcess.stdout.on("data", function (data) {
        if (data.indexOf("Appium REST http interface listener started") > -1) {
            startTests();
        }
    });
}

function main() {
    parseArgs();
    setPackagePath(function () {
        startAppiumServer();
    });
}

main();
