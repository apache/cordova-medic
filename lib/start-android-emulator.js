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

var medicKill   = require("../medic/medic-kill");
var util        = require("./util");
var path        = require("path");
var optimist    = require("optimist");

var ANDROID_EMU_START_MAX_ATTEMPTS = 3;
var ANDROID_EMU_START_TIMEOUT      = 180000; // in milliseconds (3 minutes)


/*
 * Attempts to start the Android emulator by calling the emulator.js script in
 * the Android platform directory of the app. If the emulator fails to boot, we
 * retry a specified number of times.
 *
 * @param {string} appPath          An ABSOLUTE path to the app's project folder
 * @param {number} numberOfTries    Number of times to attempt to start the emulator
 *
 * @returns {promise}   A promise that resolves to the ID of the emulator or
 *                      null if it failed to start
 */
function startAndroidEmulator(appPath, numberOfTries, timeout) {
    // We need to get the emulator script from within the Android platforms folder
    var emuPath = path.join(appPath, "platforms", "android", "cordova", "lib", "emulator");
    var emulator = require(emuPath);

    var tryStart = function(numberTriesRemaining) {
        return emulator.start(null, timeout)
        .then(function(emulatorId) {
            if (emulatorId) {
                return emulatorId;
            } else if (numberTriesRemaining > 0) {
                // Emulator must have hung while booting, so we need to kill it
                medicKill(util.ANDROID);
                return tryStart(numberTriesRemaining - 1);
            } else {
                return null;
            }
        });
    };

    // Check if the emulator has already been started
    return emulator.list_started()
    .then(function(started) {
        if (started && started.length > 0) {
            return started[0];
        } else {
            return tryStart(numberOfTries);
        }
    });
}


function main() {
    var argv = optimist
        .usage("Usage: $0 {options}")
        .demand("app")
        .default("attempts", ANDROID_EMU_START_MAX_ATTEMPTS)
        .default("timeout", ANDROID_EMU_START_TIMEOUT)
        .argv;

    var workingDir = process.cwd();
    var appPath = path.isAbsolute(argv.app) ? argv.app : path.resolve(workingDir, argv.app);

    startAndroidEmulator(appPath, argv.attempts, argv.timeout)
    .done(function(emulatorId) {
        if (!emulatorId) {
            process.exit(1);
        }
    });
}

main();
