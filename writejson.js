var path = require ('path');
var shell = require('shelljs');
var fs = require('fs');

var TEST_DIR=process.cwd();
var MSPEC_DIR=path.join(TEST_DIR,'mobilespec');

fs.writeFileSync(path.join(MSPEC_DIR,'.cordova','config.json'),
'{\
  "id":"org.apache.mobilespec",\
  "name":"mobilespec",\
  "lib": {\
    "android": {\
      "uri": "'+TEST_DIR+'/cordova-android",\
      "version": "dev",\
      "id": "cordova-android-dev"\
    },\
    "ios": {\
      "uri": "'+TEST_DIR+'/cordova-ios",\
      "version": "dev",\
      "id": "cordova-ios-dev"\
    }\
  }\
}');

