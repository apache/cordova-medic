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

// helpers
function cloneProject(projectName, projectsConfig) {

    var project  = projectsConfig[projectName];
    var codebase = project.codebases[project.codebase];
    var command  = "git clone " + codebase.repo + " --branch=" + codebase.branch + " --depth 1";

    shelljs.exec(command, {silent: false, async: true}, function (returnCode, output) {
        if (returnCode !== 0) {
            util.fatal("command \"" + command + "\" failed with code " + returnCode);
        }
    });
}

// main
function main() {

    // shell config
    shelljs.config.fatal  = false;
    shelljs.config.silent = false;

    // get args
    var argv = optimist
        .usage("Usage: $0 --config {path} --exclude {name[,name[,...]]}")
        .demand("config")
        .describe("exclude", "repositories not to clone")
        .argv;

    var configFile    = argv.config;
    var excludedNames = [];

    // parse excludes
    if (argv.exclude) {
        excludedNames = argv.exclude.split(",");
    }

    // read in config
    var projectsConfig = JSON.parse(fs.readFileSync(configFile, util.DEFAULT_ENCODING));

    // clone all projects in the config
    for (var projectName in projectsConfig) {
        if (excludedNames.indexOf(projectName) === (-1)) {
            cloneProject(projectName, projectsConfig);
        }
    }
}

main();
