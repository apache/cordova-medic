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

var shelljs  = require("shelljs");
var optimist = require("optimist");
var fs       = require("fs");
var path     = require("path");

var util = require("../lib/util");

// constants
var DEVICE_ROW_PATTERN = /(emulator|device|host)/m;
var HEADING_LINE_PATTERN = /List of devices/m;

// helpers
function logAndroid() {

    var logCommand = "adb logcat -d";
    var listCommand = "adb devices";

    util.medicLog("running:");
    util.medicLog("    " + listCommand);

    // bail out if there is more/less than one device
    var numDevices = 0;
    var result = shelljs.exec(listCommand, {silent: false, async: false});
    result.output.split('\n').forEach(function (line) {
        if (!HEADING_LINE_PATTERN.test(line) && DEVICE_ROW_PATTERN.test(line)) {
            numDevices += 1;
        }
    });
    if (numDevices != 1) {
        util.fatal("there must be exactly one emulator/device attached");
    }

    // log the output
    util.medicLog("running:");
    util.medicLog("    " + logCommand);
    shelljs.exec(logCommand, {silent: false, async: false}, function (code, output) {
        if (code > 0) {
            util.fatal("Failed to run logcat command.");
        }
    });
}

function logBlackberry() {
    return;
}

function logIOS() {
    // We need to print out the system log for the simulator app. In order to figure
    // out the path to that file, we need to find the ID of the simulator running
    // mobilespec

    // First, figure out the simulator that ran mobilespec. "cordova run"" just chooses
    // the last simulator in this list that starts with the word "iPhone"
    var findSimCommand = getLocalCLI() + " run --list --emulator | grep ^iPhone | tail -n1";

    util.medicLog("running:");
    util.medicLog("    " + findSimCommand);

    var findSimResult = shelljs.exec(findSimCommand);

    if (findSimResult.code > 0) {
        util.fatal("Failed to find simulator we deployed to");
        return;
    }

    var split = findSimResult.output.split(", ");

    // Format of the output is "iPhone-6s-Plus, 9.1"
    // Extract the device name and the version number
    var device = split[0].replace(/-/g, " ").trim();
    var version = split[1].trim();

    // Next, figure out the ID of the simulator we found
    var instrCommand = "instruments -s devices | grep ^iPhone";
    util.medicLog("running:");
    util.medicLog("    " + instrCommand);

    var instrResult = shelljs.exec(instrCommand);

    if (instrResult.code > 0) {
        util.fatal("Failed to get the list of simulators");
        return;
    }

    // This matches <device> (<version>) [<simulator-id>]
    var simIdRegex = /^([a-zA-Z\d ]+) \(([\d.]+)\) \[([a-zA-Z\d\-]*)\]$/;

    var simId = null;
    var lines = instrResult.output.split(/\n/);
    lines.forEach(function(line) {
        var simIdMatch = simIdRegex.exec(line);
        if (simIdMatch && simIdMatch.length === 4 && simIdMatch[1] === device && simIdMatch[2] === version) {
            simId = encodeURIComponent(simIdMatch[3]);
        }
    });

    if (simId) {
        // Now we can print out the log file
        var logPath = path.join("~", "Library", "Logs", "CoreSimulator", simId, "system.log");
        var logCommand = "cat " + logPath;

        util.medicLog("Attempting to print the iOS simulator system log");

        var logResult = shelljs.exec(logCommand);
        if (logResult.code > 0) {
            util.fatal("Failed to cat the simulator log");
        }
    } else {
        util.fatal("Failed to find ID of mobilespec simulator");
    }
}

function logWindows(timeout) {
    var logScriptPath = path.join("mobilespec", "platforms", "windows", "cordova", "log.bat");
    if (fs.existsSync(logScriptPath)) {
        var mins = util.DEFAULT_LOG_TIME;
        if (timeout) {
            mins = util.secToMin(timeout) + util.DEFAULT_LOG_TIME_ADDITIONAL;
        }
        shelljs.exec(logScriptPath + " --dump --mins " + mins, function (code, output) {
            if (code > 0) {
                util.fatal("Failed to run log command.");
            }
        });
    }
}

function logWP8() {
    return;
}

function getLocalCLI() {
    if (util.isWindows()) {
        return "cordova.bat";
    } else {
        return "./cordova";
    }
}

// main
function main() {

    // shell config
    shelljs.config.fatal  = false;
    shelljs.config.silent = false;

    // command-specific args
    var argv = optimist
        .usage("Usage: $0 [options]")
        .demand("platform")
        .describe("platform", "Gather logs for this platform.")
        .describe("timeout", "Windows only, gather logs for last n seconds.")
        .argv;

    var platform = argv.platform;
    var timeout = argv.timeout;

    switch (platform) {
        case util.ANDROID:
            logAndroid();
            break;
        case util.BLACKBERRY:
            logBlackberry();
            break;
        case util.IOS:
            logIOS();
            break;
        case util.WINDOWS:
            logWindows(timeout);
            break;
        case util.WP8:
            logWP8();
            break;
        default:
            console.warn("Logging is unsupported for " + platform);
            break;
    }
}

main();
