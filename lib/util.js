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

module.exports = (function() {

    var os = require("os");
    var shelljs = require("shelljs");
    var util = require('util');
    var path = require('path-extra');

    // constants
    var ESCAPE = String.fromCharCode(27);
    var RED_COLOR = ESCAPE + "[31m";
    var NO_COLOR = ESCAPE + "[m";
    var DEVICE_ROW_PATTERN = /(emulator|device|host)/m;
    var HEADING_LINE_PATTERN = /List of devices/m;

    function medicLog(message) {
        console.log(RED_COLOR + "[MEDIC LOG " + new Date().toUTCString() + "]" + NO_COLOR + " " + message);
    }

    function contains(collection, item) {
        return collection.indexOf(item) !== (-1);
    }

    function isWindows() {
        // NOTE:
        //      - including "^" because otherwise "Darwin" matches
        //      - only "win" and not "windows" because "win32" should also match
        return /^win/.test(os.platform());
    }

    function fatal(message) {
        medicLog("FATAL: " + message);
        process.exit(1);
    }

    function secToMin(seconds) {
        return Math.ceil(seconds / 60);
    }

    function getSimulatorsFolder() {
        var simulatorsFolderPath = path.join(path.homedir(), "Library", "Developer", "CoreSimulator", "Devices");
        return simulatorsFolderPath;
    }

    function countAndroidDevices() {
        var listCommand = "adb devices";

        medicLog("running:");
        medicLog("    " + listCommand);

        var numDevices = 0;
        var result = shelljs.exec(listCommand, { silent: false, async: false });
        result.output.split('\n').forEach(function(line) {
            if (!HEADING_LINE_PATTERN.test(line) && DEVICE_ROW_PATTERN.test(line)) {
                numDevices += 1;
            }
        });

        return numDevices;
    }

    function getSimId() {
        var findSimCommand = "cordova run --list --emulator | grep ^iPhone | tail -n1";

        medicLog("running:");
        medicLog("    " + findSimCommand);

        var findSimResult = shelljs.exec(findSimCommand, { silent: true, async: false });

        if (findSimResult.code > 0) {
            medicLog("Failed to find simulator we deployed to");
            return;
        }

        var split = findSimResult.output.split(", ");

        // Format of the output is "iPhone-6s-Plus, 9.1"
        // Extract the device name and the version number
        var device = split[0].replace(/-/g, " ").trim();
        var version = split[1].trim();
        medicLog("device: " + device);

        // Next, figure out the ID of the simulator we found
        var instrCommand = "instruments -s devices | grep ^iPhone";
        medicLog("running:");
        medicLog("    " + instrCommand);

        var instrResult = shelljs.exec(instrCommand, { silent: true, async: false });

        if (instrResult.code > 0) {
            medicLog("Failed to get the list of simulators");
            return;
        }

        // This matches <device> (<version>) [<simulator-id>]
        // ... or <device> (<version>) [<simulator-id>] (Simulator) in Xcode 7.3
        var simIdRegex = /^([a-zA-Z\d ]+) \(([\d.]+)\) \[([a-zA-Z\d\-]*)\].*$/;


        var simId = null;
        var lines = instrResult.output.split(/\n/);
        lines.forEach(function(line) {
            var simIdMatch = simIdRegex.exec(line);
            if (simIdMatch && simIdMatch.length === 4 && simIdMatch[1] === device && simIdMatch[2] === version) {
                simId = encodeURIComponent(simIdMatch[3]);
            }
        });

        return simId;
    }

    function doesFileExist(filePath) {
        var fileExists = false;
        try {
            stats = fs.statSync(filePath);
            fileExists = true;
        } catch (e) {
            fileExists = false;
        }
        return fileExists;
    }

    function getSqlite3InsertionCommand(destinationTCCFile, service, appName) {
        return util.format('sqlite3 %s "insert into access'
            + '(service, client, client_type, allowed, prompt_count, csreq) values(\'%s\', \'%s\', '
            + '0,1,1,NULL)"', destinationTCCFile, service, appName);
    }

    return {

        // constants
        ANDROID: "android",
        BLACKBERRY: "blackberry10",
        IOS: "ios",
        WINDOWS: "windows",

        DEFAULT_ENCODING: "utf-8",
        DEFAULT_LOG_TIME: 15,
        DEFAULT_LOG_TIME_ADDITIONAL: 2,

        // functions
        fatal: fatal,
        isWindows: isWindows,
        medicLog: medicLog,
        contains: contains,
        secToMin: secToMin,
        countAndroidDevices: countAndroidDevices,
        getSimulatorsFolder: getSimulatorsFolder,
        getSimId: getSimId,
        doesFileExist: doesFileExist,
        getSqlite3InsertionCommand: getSqlite3InsertionCommand
    };
} ());
