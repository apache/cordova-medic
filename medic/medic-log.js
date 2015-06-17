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
function logAndroid() {

    var command = "adb logcat -d";

    util.medicLog("running:");
    util.medicLog("    " + command);

    shelljs.exec(command, function (code, output) {
        if (code > 0) {
            util.fatal("Failed to run logcat command.");
        }
    });
}

function logBlackberry() {
    return;
}

function logIOS() {
    return;
}

function logWindows() {
    return;
}

function logWP8() {
    return;
}

// main
function main() {

    // shell config
    shelljs.config.fatal  = false;
    shelljs.config.silent = false;

    // command-specific args
    var argv = optimist
        .usage("Usage: $0 {platform}")
        .demand("platform")
        .argv;

    var platform = argv.platform;

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
            logWindows();
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
