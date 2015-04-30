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

module.exports = function () {

    var os = require("os");

    return {

        // constants
        ANDROID:    "android",
        BLACKBERRY: "blackberry10",
        IOS:        "ios",
        WINDOWS:    "windows",
        WP8:        "wp8",

        DEFAULT_ENCODING: "utf-8",

        // functions
        fatal: function (message) {
            console.error("FATAL: " + message);
            process.exit(1);
        },

        isWindows: function () {
            // NOTE:
            //      - including "^" because otherwise "Darwin" matches
            //      - only "win" and not "windows" because "win32" should also match
            return /^win/.test(os.platform());
        },

        medicLog: function (message) {
            var RED_COLOR = "\033[31m";
            var NO_COLOR  = "\033[m";
            console.log(RED_COLOR + "[MEDIC LOG " + new Date().toUTCString() + "]" + NO_COLOR + " " + message);
        },

        contains: function (collection, item) {
            return collection.indexOf(item) != (-1);
        }
    };
}();
