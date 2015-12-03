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

var q = require("q");

var couchdb = require("./couchdb");

var mobilespec_results = null;

function init(uri) {
    couchdb.init(uri);
    mobilespec_results = new couchdb.db("mobilespec_results");
}

function query_for_sha(sha, callback) {
    var view = "sha?key=\"" + sha + "\"";
    // get build errors from couch for each repo
    mobilespec_results.query_view("results", view, function(error, result) {
        if (error) {
            console.error("query failed for mobilespec_results", error);
            callback(true, error);
            return;
        }
        callback(false, result);
    });
}

function isTestsCompleted(sha, callback) {
    query_for_sha(sha, function (isFailed, res) {
        // return True if there is no error and there are test results in db for specified sha
        callback(!isFailed && res.rows.length > 0);
    });
}

function waitTestsCompleted(sha, timeoutMs) {

    var defer          = q.defer();
    var startTime      = Date.now();
    var timeoutTime    = startTime + timeoutMs;
    var checkInterval  = 10 * 1000; // 10 secs

    var testFinishedFn = setInterval(function () {
        isTestsCompleted(sha, function (isSuccess) {
            // if tests are finished or timeout
            if (isSuccess || Date.now() > timeoutTime) {
                clearInterval(testFinishedFn);
                if (isSuccess) {
                    defer.resolve();
                } else {
                    defer.reject("timed out");
                }
            }
        });
    }, checkInterval);
    return defer.promise;
}

module.exports = {
    init:               init,
    waitTestsCompleted: waitTestsCompleted,
};
