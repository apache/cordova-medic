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

var optimist = require("optimist");

var testcheck = require("../lib/testcheck");

function main() {

    // get args
    var argv = optimist
        .usage("Usage: $0 {options}")
        .demand("id")
        .demand("couchdb")
        .argv;

    var buildId    = argv.id;
    var couchdbURI = argv.couchdb;

    var result = testcheck(buildId, couchdbURI);
    result.then(
        function onFulfilled(value) {
            if (value === true) {
                process.exitCode = 0;
            } else {
                process.exitCode = 1;
            }
        },
        function onRejected(error) {
            console.error("test check failed: " + error);
            process.exitCode = 1;
        }
    );
}

main();
