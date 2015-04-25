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

"use strict";

// node dependencies
var fs = require("fs");
var os = require("os");

// external dependencies
var shelljs  = require("shelljs");
var optimist = require("optimist");

// constants
var MAX_REMOVAL_ATTEMPTS = 3;

// parse args
var argv = optimist
    .usage("Usage: $0 [command]")
    .demand(1)
    .argv;

// helpers
function fatal(message) {
    console.error("ERROR: " + message);
    process.exit(1);
}

function contains(collection, item) {
    return collection.indexOf(item) != (-1);
}

function exclusiveLs(lsPath, excludes) {
    var paths = fs.readdirSync(lsPath);
    return paths.filter(function (pathName) {
        return !contains(excludes, pathName);
    });
}

// subcommands
function commandClean() {

    // command-specific args
    argv = optimist
        .usage("Usage: $0 --exclude {name[,name[,...]]}")
        .argv;

    // get args
    var excludeString = argv.exclude;
    var excludedPaths = [".", ".."];

    if (argv.exclude) {
        excludedPaths = excludedPaths.concat(excludeString.split(","));
    }

    // get all directories except excluded ones
    var pathsToRemove = exclusiveLs(".", excludedPaths);

    console.log("NOT removing the following paths:");
    console.log(excludedPaths);
    console.log("removing the following paths:");
    console.log(pathsToRemove);

    // skip if no paths to delete
    if (pathsToRemove.length <= 0) {
        return;
    }

    // attempt to delete the paths
    var attempts = 0;
    var success  = false;
    while (success === false) {

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
        fatal("failed to remove files");
    }
}

// main
function main() {

    // shell config
    shelljs.config.fatal  = false;
    shelljs.config.silent = false;

    // get args
    var command = argv._[0];

    // run command
    switch (command) {
        case "clean":
            commandClean();
            break;
        default:
            fatal("unknown command " + command);
    }
}

main();
