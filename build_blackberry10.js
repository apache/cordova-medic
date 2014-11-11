var path = require ('path'),
    shell = require('shelljs'),
    buildinfo = require('./buildinfo'),
    config = require('./config'),
    blackberry10  = require('./src/build/makers/blackberry10'),
    argv = require('optimist').argv;
var testcheck = require('./testchecker');

// this assumes that you start it in the sandbox

var TEST_DIR=process.cwd();
var BRANCH='master';
var TOOL_DIR=path.join(TEST_DIR,'medic');
var MSPEC_DIR=path.join(TEST_DIR,'mobilespec');

var TEST_OK=true;

if(argv.branch) BRANCH=argv.branch;

var output_location = path.join(MSPEC_DIR);

buildinfo('BlackBerry', BRANCH, function (error, sha ) {
    if(error) {
        TEST_OK=false;
    } else {
        blackberry10(output_location, sha, config.app.entry, config.couchdb.host, function(err){
            if(err) {
                console.log('BlackBerry test prepare failed');
                TEST_OK=false;
            } else {
                console.log('BlackBerry tests complete');
                TEST_OK = true;
            }
       });
    }
});

process.once('exit', function () {
    if(!TEST_OK) process.exit(1);
});

