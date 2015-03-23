var path = require ('path');
var shell = require('shelljs');
var buildinfo = require('./buildinfo');
var config = require('./config');
var firefoxos  = require('./src/build/makers/firefoxos');
var argv = require('optimist').argv;
var testcheck = require('./testchecker');

// this assumes that you start it in the sandbox

var TEST_DIR=process.cwd().replace(/\\/g, '\\\\');
var BRANCH='master';
var TOOL_DIR=path.join(TEST_DIR,'medic');
var MSPEC_DIR=path.join(TEST_DIR,'mobilespec');

var TEST_OK=true;

if(argv.branch) BRANCH=argv.branch;

var output_location = path.join(MSPEC_DIR,'platforms','firefoxos');

buildinfo('FirefoxOS', BRANCH, function (error, sha ) {
    if(error) {
        TEST_OK=false;
    } else {
        firefoxos(output_location, sha,'', config.app.entry, config.couchdb, function(err){
            if(err) {
                console.log('FirefoxOS test prepare failed');
                TEST_OK=false;
            } else {
                console.log('FirefoxOS tests complete');
                TEST_OK = true;
            }
       });
    }
});

process.once('exit', function () {
    if(!TEST_OK) process.exit(1);
});

