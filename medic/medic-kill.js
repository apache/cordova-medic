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

var util = require("../lib/util");

// helpers
function tasksOnPlatform(platformName) {
    switch (platformName) {
        case util.WINDOWS:
            return ["WWAHost.exe", "Xde.exe"];
        case util.WP8:
            return ["Xde.exe"];
        case util.IOS:
            return ["iOS Simulator"];
        case util.ANDROID:
            if (util.isWindows()) {
                return ["emulator-arm.exe"];
            } else {
                return ["emulator64-x86", "emulator64-arm"];
            }
            break;
        case util.BLACKBERRY:
            return [];
        default:
            util.fatal("unknown platform " + platformName);
    }
}

function getKillCommand(taskNames) {

    var cli;
    var args;

    if (util.isWindows()) {
        cli  = "taskkill /F";
        args = taskNames.map(function (name) { return "/IM \"" + name + "\""; });
    } else {
        cli  = "killall -9";
        args = taskNames.map(function (name) { return "\"" + name + "\""; });
    }

    return cli + " " + args.join(" ");
}

function killTasks(taskNames) {

    if (!taskNames || taskNames.length < 1) {
        return;
    }

    var command = getKillCommand(taskNames);

    util.medicLog("running the following command:");
    util.medicLog("    " + command);

    shelljs.exec(command, {silent: false, async: true}, function (returnCode, output) {
        if (returnCode !== 0) {
            console.warn("WARNING: kill command returned " + returnCode);
        }
    });
}

function killTasksForPlatform(platform) {
    // shell config
    shelljs.config.fatal  = false;
    shelljs.config.silent = false;

    // get platform tasks
    var platformTasks = tasksOnPlatform(platform);

    if (platformTasks.length < 1) {
        console.warn("no known tasks to kill");
    }

    // kill them
    killTasks(platformTasks);
}

// main
function main() {
    // get args
    var argv = optimist
        .usage("Usage: $0 --platform {platform}")
        .demand("platform")
        .argv;

    killTasksForPlatform(argv.platform);
}

module.exports = killTasksForPlatform;

// This script can be required or run directly
if (require.main === module) {
    main();
}
