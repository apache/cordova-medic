#!/bin/bash

# move up to the sandbox

cd ..
echo ==== Cleaning up ====
rm -rf cordova-*
rm -rf mobilespec

echo ==== Installing coho ====
git clone https://github.com/apache/cordova-coho.git
cd cordova-coho
npm install
cd ..

echo ==== Getting repositories ====
./cordova-coho/coho repo-clone -r plugins -r mobile-spec -r android -r ios -r cli -r js
cd cordova-cli
npm install
cd ..

echo ==== Creating mobilespec ====
./cordova-cli/bin/cordova create mobilespec org.apache.mobilespec mobilespec
cd mobilespec
cp ../medic/cordova_config.json .cordova/config.json
../cordova-cli/bin/cordova platform add android ios
echo ==== Adding plugins to mobilespec ====
../cordova-cli/bin/cordova -d plugin add ../cordova-mobile-spec/dependencies-plugin
echo ==== Modifying www for mobilespec ====
rm -r www
ln -s ../cordova-mobile-spec www

echo ==== updating cordova-js ====
cd ../cordova-js
npm install
grunt
cd ../mobilespec
cp ../cordova-js/pkg/cordova.ios.js platforms/ios/www/cordova.js
cp ../cordova-js/pkg/cordova.android.js platforms/android/assets/www/cordova.js

echo ==== Preparing mobilespec ====
../cordova-cli/bin/cordova prepare

echo ==== patching for test ====
cd ../medic 
node build.js
cd ../mobilespec

echo ==== Building for android ==== 
../cordova-cli/bin/cordova build android

echo ==== Building for ios ==== 
../cordova-cli/bin/cordova build ios

echo ==== Deploying to android ==== 
../cordova-cli/bin/cordova run android

echo ==== Deploying to ios ==== 
# ../cordova-cli/bin/cordova emulate ios


