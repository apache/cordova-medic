var path = require ('path');
var shell = require('shelljs');
var fs = require('fs');
var couch = require('./src/couchdb/interface');

var argv = require('optimist').boolean(['android','ios','js']).argv;

var TEST_DIR=process.cwd();
var BRANCH='master';
var TOOL_DIR=path.join(TEST_DIR,'medic');
var MSPEC_DIR=path.join(TEST_DIR,'mobilespec');

//records a success in the couchdb
function success(platform,sha,component,details) {
    var doc= {
         mobilespec:details,
         sha:sha,
         platform:platform,
         version:component,
         timestamp:Math.round(Math.floor((new Date()).getTime() / 1000)),
         model:''
    };

    // fire off to couch
    var doc_id_array = [doc.platform, sha];
    doc_id_array = doc_id_array.map(encodeURIComponent);
    var doc_id = doc_id_array.join('__');
    couch.mobilespec_results.clobber(doc_id, doc, function(resp) {
        if (resp.error) {
            console.error('[COUCH ERROR] Saving doc with id ' + doc_id);
        }
    });
}

// records an error in the couch db
function error(platform,sha,failure,details) {
    var doc = {
        sha:sha,
        timestamp:(new Date().getTime() / 1000),
        platform:platform.toLowerCase(),
        failure:failure,
        details:details
    };

    // fire off to couch
    var doc_id_array = [doc.platform, sha];
    doc_id_array = doc_id_array.map(encodeURIComponent);
    var doc_id = doc_id_array.join('__');
    couch.build_errors.clobber(doc_id, doc, function(resp) {
        if (resp.error) {
            console.error('[COUCH ERROR] Saving doc with id ' + doc_id);
        }
    });
}


