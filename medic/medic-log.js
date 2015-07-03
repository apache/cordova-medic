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
var xml2js   = require("xml2js");

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
    var startTime = fs.readFileSync("startTime.txt", util.DEFAULT_ENCODING);
    var command = "wevtutil qe Microsoft-Windows-AppHost/ApplicationTracing /q:\"*[System [(TimeCreated [@SystemTime>'" + startTime + "'])]]\"";

    util.medicLog("running:");
    util.medicLog("    " + command);

    shelljs.exec(command, { silent: true }, function (code, output) {
        output = '<root>' + output + '</root>';

        if (code != 0) {
            util.fatal("Failed to run wevtutil command.");
        } else {
            xml2js.parseString(output, function (err, result) {
                if (err) {
                    util.fatal("An error occured while parsing events XML: " + JSON.stringify(err));
                } else if (result && result.root && result.root.Event) {
                    var formattedJson = result.root.Event.map(function (event) {
                        var ts, proc, src, msg;
                        try {
                            ts = event.System[0].TimeCreated[0].$.SystemTime;
                        } catch (err) { }
                        try {
                            proc = event.UserData[0].WWADevToolBarLog[0].DisplayName[0]
                        } catch (err) { }
                        try {
                            src = event.UserData[0].WWADevToolBarLog[0].Source[0];
                        } catch (err) { }
                        try {
                            msg = event.UserData[0].WWADevToolBarLog[0].Message[0];
                        } catch (err) { }

                        return { "timestamp": ts, "process": proc, "source": src, "message": msg };
                    });
                    formattedJson.filter(function (event) {
                        if (event.message) {
                            return true;
                        }
                        return false;
                    }).forEach(function (event) {
                        var timestamp = event.timestamp + ' ';
                        var proc = event.process ? event.process + ' ' : '';
                        var source = event.source || '';
                        console.log(timestamp + proc + source + ' -> ' + event.message);
                    });
                } else {
                    util.medicLog("No logs to display :(");
                }

            });
        }
    });
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
