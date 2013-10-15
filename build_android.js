var path = require ('path');
var shell = require('shelljs');
var buildinfo = require('./buildinfo');
var config = require('./config');
var android  = require('./src/build/makers/android');
var argv = require('optimist').argv;

// this assumes that you start it in the sandbox

var TEST_DIR=process.cwd();
var BRANCH='master';
var TOOL_DIR=path.join(TEST_DIR,'medic');
var MSPEC_DIR=path.join(TEST_DIR,'mobilespec');

var TEST_OK=true;

if(argv.branch) BRANCH=argv.branch;

var output_location = path.join(MSPEC_DIR,'platforms','android');

buildinfo('Android', BRANCH, function (error, sha ) {
    if(error) {
        TEST_OK=false;
    } else {
        android(output_location, sha,'', config.app.entry, config.couchdb.host, function(err){
            if(err) {
                console.log('Android test prepare failed')
                TEST_OK=false;
            } else {
                console.log('Android tests complete')
            }
       });
    }
});

process.once('exit', function () {
    if(!TEST_OK) process.exit(1);
});

