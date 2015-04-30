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

module.exports = function (sha, dbHost) {

    var http = require('http'),
        url = require('url'),
        q = require('q');

    function getDocumentIdBySha() {
        var options = {
            host : url.parse(dbHost).hostname,
            port : url.parse(dbHost).port,
            path : '/mobilespec_results/_all_docs?start_key="' + sha + '"&limit=1'
        },
            resultsDoc = '',
            d = q.defer();

        http.get(options, function (result) {
            result.on("data", function (chunk) {
                resultsDoc += chunk.toString();
            });
            result.on('end', function () {
                d.resolve(JSON.parse(resultsDoc).rows[0].id);
            });
        }).on('error', function (e) {
            console.log("Got error: " + e.message);
            d.reject(e);
        });

        return d.promise;
    };

    function getTestResult(resultId) {
        var options = {
            host : url.parse(dbHost).hostname,
            port : url.parse(dbHost).port,
            path : '/mobilespec_results/' + resultId
        };
        var d = q.defer();
        var resultsJSON = "";
        var failure;

        http.get(options, function (res) {
            res.on("data", function (chunk) {
                resultsJSON += chunk;
            });
            res.on('end', function () {
                d.resolve(JSON.parse(resultsJSON));
            });
        }).on('error', function (e) {
            console.log("Got error: " + e.message);
            d.reject(e);
        });

        return d.promise;
    };

    return getDocumentIdBySha().then(getTestResult);
};
