var path = require ('path');
var shell = require('shelljs');
var fs = require('fs');
var argv = require('optimist').argv;

var TEST_DIR=process.cwd();
var MSPEC_DIR=path.join(TEST_DIR,'mobilespec');
var BRANCH="dev";

if(argv.branch) BRANCH=argv.branch;

fs.writeFileSync(path.join(MSPEC_DIR,'.cordova','config.json'),
'{\
  "id":"org.apache.mobilespec",\
  "name":"mobilespec",\
  "lib": {\
    "android": {\
      "uri": "'+TEST_DIR+'/cordova-android",\
      "version": "'+BRANCH+'" ,\
      "id": "cordova-android-'+BRANCH+'"\
    },\
    "ios": {\
      "uri": "'+TEST_DIR+'/cordova-ios",\
      "version": "'+BRANCH+'",\
      "id": "cordova-ios-'+BRANCH+'"\
    }\
  }\
}');

