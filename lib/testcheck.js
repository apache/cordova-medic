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

module.exports = function (sha, dbHost, maxnumberoftries, delay) {

    var http = require("http"),
        url = require("url"),
        q = require("q"),
        util = require("./util");

    function tryConnect(options, d, pendingnumberoftries, operation, successCallBack){
        http.get(options, successCallBack)
            .on("error", function(e){
                if(pendingnumberoftries > 1){
                    util.medicLog("Connection attempt to " + operation + " failed. Will try after: " + delay + " milliseconds.");

                    setTimeout(function (){
                        tryConnect(options, d, pendingnumberoftries-1, operation, successCallBack);
                    }, delay);
                } else {
                    util.medicLog("Failed to get document id after " + maxnumberoftries + " attempts.");
                    util.medicLog("Got error: " + e.message);
                    d.reject(e);
                }
            });
        return d.promise;
    }

    function getDocumentIdBySha() {
        var options = {
            host : url.parse(dbHost).hostname,
            port : url.parse(dbHost).port,
            path : "/mobilespec_results/_all_docs?start_key=\"" + sha + "\"&end_key=\"" + sha + "~\"&limit=1"
        },
        resultsDoc = "",
        d = q.defer();
        
        return tryConnect(options, d, maxnumberoftries, "getDocumentIdBySha", function (result) {
            result.on("data", function (chunk) {
                resultsDoc += chunk.toString();
            });
            result.on("end", function () {
                var parsedResult = JSON.parse(resultsDoc);
                if (parsedResult.rows && parsedResult.rows.length > 0) {
                    d.resolve(parsedResult.rows[0].id);
                } else {
                    d.reject("There are no results for current test run in DB.");
                }
            });
        });
    }

    function getTestResult(resultId) {
        var options = {
            host : url.parse(dbHost).hostname,
            port : url.parse(dbHost).port,
            path : "/mobilespec_results/" + encodeURIComponent(resultId)
        };
        var d = q.defer();
        var resultsJSON = "";
        
        return tryConnect(options, d, maxnumberoftries, "getTestResult", function (result) {
            result.on("data", function (chunk) {
                resultsJSON += chunk;
            });
            result.on("end", function () {
                d.resolve(JSON.parse(resultsJSON));
            });
        });
    }

    return getDocumentIdBySha().then(getTestResult);
};
