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

var fs = require("fs");

var shelljs  = require("shelljs");
var optimist = require("optimist");
var util     = require("../lib/util");

// main
function main() {

    // shell config
    shelljs.config.fatal  = false;
    shelljs.config.silent = false;

    // command-specific args
    var argv = optimist
        .usage("Usage: $0 {platform}")
        .demand('platform')
        .argv;

    switch (argv.platform) {
        case util.ANDROID:
            var cmd = "adb logcat -d";
            console.log("executing " + cmd);
            shelljs.exec(cmd, function(code, output) {
                if (code > 0) {
                    util.fatal('Failed to run logcat command.');
                }
            });
            break;
        default:
            console.warn("Logging is unsupported for " + argv.platform);
            break;
    }
}

main();
