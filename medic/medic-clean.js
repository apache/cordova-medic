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

var util = require("../lib/util");

// constants
var MAX_REMOVAL_ATTEMPTS = 3;

// helpers
function exclusiveLs(lsPath, excludes) {
    var paths = fs.readdirSync(lsPath);
    return paths.filter(function (pathName) {
        return !util.contains(excludes, pathName);
    });
}

// main
function main() {

    // shell config
    shelljs.config.fatal  = false;
    shelljs.config.silent = false;

    // get args
    var argv = optimist
        .usage("Usage: $0 --exclude {name[,name[,...]]}")
        .argv;

    var excludeString = argv.exclude;
    var excludedPaths = [".", ".."];

    // parse excludes
    if (argv.exclude) {
        excludedPaths = excludedPaths.concat(excludeString.split(","));
    }

    // get all directories except excluded ones
    var pathsToRemove = exclusiveLs(".", excludedPaths);

    util.medicLog("NOT removing the following paths:");
    util.medicLog("[ " + excludedPaths.join(" , ") + " ]");
    util.medicLog("removing the following paths:");
    util.medicLog("[ " + pathsToRemove.join(" , ") + " ]");

    // skip if there are no paths to delete
    if (pathsToRemove.length <= 0) {
        return;
    }

    // attempt to delete the paths
    var attempts = 0;
    var success  = false;
    while (success === false) {

        util.medicLog("cleanup attempt #" + attempts + " started");

        // try to remove the paths
        shelljs.rm("-rf", pathsToRemove);

        // check if any of them remain
        var remainingPaths = exclusiveLs(".", excludedPaths);
        if (remainingPaths.length === 0) {
            success = true;
        } else {
            console.error("cleanup attempt #" + attempts + " failed");
        }

        // limit the number of attempts
        attempts += 1;
        if (attempts >= MAX_REMOVAL_ATTEMPTS) {
            break;
        }
    }

    // if loop exited without success, return an error
    if (success === false) {
        console.error("failed to remove files");
        process.exitCode = 1;
    } else {
        util.medicLog("cleanup succeeded");
    }
}

main();
