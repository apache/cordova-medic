var path = require ('path');
var shell = require('shelljs');
var buildinfo = require('./buildinfo');
var config = require('./config');
var ios  = require('./src/build/makers/ios');
var argv = require('optimist').argv;

// this assumes that you start it in the sandbox

var TEST_DIR=process.cwd();
var BRANCH='master';
var TOOL_DIR=path.join(TEST_DIR,'medic');
var MSPEC_DIR=path.join(TEST_DIR,'mobilespec');
var output_location = path.join(MSPEC_DIR,'platforms','ios');
var library_location = path.join(TEST_DIR,'cordova-ios');

var TEST_OK=true;

if(argv.branch) BRANCH=argv.branch;

buildinfo('ios', BRANCH, function (error, sha ) {
    if(error) {
               TEST_OK=false;
    } else {
       ios(output_location, library_location,TOOL_DIR, sha,'', config.app.entry, config.couchdb.host, function(err){
           if(err) {
               console.log('iOS test prepare failed')
               TEST_OK=false;
           } else {
               console.log('iOS tests complete')
           }
       });
    }
});

process.once('exit', function () {
    if(!TEST_OK) process.exit(1);
});

