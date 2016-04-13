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
        case util.IOS:
            return ["iOS Simulator", "Simulator"];
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

/**
 * CB-10671: In order to deal with issues where "ghost" emulators sometimes get
 * left behind, we kill the ADB server
 */
function killAdbServer() {
    util.medicLog("Killing adb server");
    var killServerCommand = "adb kill-server";

    util.medicLog("Running the following command:");
    util.medicLog("    " + killServerCommand);

    var killServerResult = shelljs.exec(killServerCommand, {silent: false, async: false});
    if (killServerResult.code !== 0) {
        util.fatal("Failed killing adb server");
    }
    util.medicLog("Finished killing adb server");
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

    var killTasksResult = shelljs.exec(command, {silent: false, async: false });
    if (killTasksResult.code !== 0) {
        console.warn("WARNING: kill command returned " + killTasksResult.code);
    }
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

    if (platform === util.ANDROID) {
        killAdbServer();
    }
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
