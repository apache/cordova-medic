
/*
Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var shell = require("shelljs"),
    util = require("util"),
    p = require("path"),
    scanner = require('./devices');

module.exports = function deploy(path, sha) {
    function log(msg) {
        console.log('[BLACKBERRY] [DEPLOY] ' + msg + ' (' + sha + ')');
    }

    function runApp(device) {
        var cmdAddTarget = util.format("cd %s && cordova/target add %s %s -t device -p %s --pin %s", 
                p.join(path, "platforms", "blackberry10"),
                device.name, device.ip, device.devicepassword, device.pin),
            cordovaPath = p.join(path, "../cordova-cli/bin/cordova"),
            cmdRun = util.format("cd %s && %s run -k %s --target %s", path, cordovaPath, device.keystorepass, device.name);
        log('Adding target: ' + device.name);
        shell.exec(cmdAddTarget, {silent: true, async: true}, function (code, output) {
            if (code === 0) {
                log("Running app on " + device.name);
                shell.exec(cmdRun);
            } else {
                log('[ERROR] failed to add target ' + device.name + "\n" + output);
            }
        });
    }

    scanner(runApp);

};
