var path = require ('path');
var shell = require('shelljs');
var fs = require('fs');
var argv = require('optimist').argv;

var TEST_DIR=process.cwd();
var MSPEC_DIR=path.join(TEST_DIR,'mobilespec');
var BRANCH="dev";
// required on Windows to correcctly escape path delimiter character
var TEST_DIR_ESCAPED = TEST_DIR.split("\\").join("\\\\");

if(argv.branch) BRANCH=argv.branch;

var cfgpath = path.join(MSPEC_DIR,'.cordova');

if(!fs.existsSync(cfgpath)) fs.mkdirSync(cfgpath);

fs.writeFileSync(path.join(MSPEC_DIR,'.cordova','config.json'),
'{\
  "id":"org.apache.mobilespec",\
  "name":"mobilespec",\
  "lib": {\
    "android": {\
      "uri": "'+TEST_DIR_ESCAPED+'/cordova-android",\
      "version": "'+BRANCH+'" ,\
      "id": "cordova-android-'+BRANCH+'"\
    },\
    "ios": {\
      "uri": "'+TEST_DIR_ESCAPED+'/cordova-ios",\
      "version": "'+BRANCH+'",\
      "id": "cordova-ios-'+BRANCH+'"\
    },\
    "wp8": {\
      "uri": "'+TEST_DIR_ESCAPED+'/cordova-wp8",\
      "version": "'+BRANCH+'",\
      "id": "cordova-wp8-'+BRANCH+'"\
    },\
    "windows8": {\
      "uri": "'+TEST_DIR_ESCAPED+'/cordova-windows",\
      "version": "'+BRANCH+'",\
      "id": "cordova-windows-'+BRANCH+'"\
    }\
  }\
}');

