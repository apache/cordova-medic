
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
var path   = require('path'),
    shell  = require('shelljs'),
    util   = require('util'),
    config = require('../../../../config');

function log(msg) {
        console.log('[BLACKBERRY] [DEVICE SCANNER] ' + msg);
}

module.exports = function blackberry_scanner(callback) {
    var device = {},
        ips = config.blackberry.devices.ips,
        password = config.blackberry.devices.password,
        storepass = config.blackberry.bb10.signingPassword;

    // figure out over what range of ips to scan
    if (ips instanceof Array) {
        ips.forEach(function(ip) {
            var cmd = util.format('blackberry-deploy -listDeviceInfo %s -password %s', ip, password);
            log('searching for device with ip: ' + ip);
            shell.exec(cmd,{silent:true,async:true},function(code, output) {
                if (code === 0) {
                    var name = /modelname::(.*?)(\r?)\n/.exec(output),
                        pin = /devicepin::0x(.*?)(\r?)\n/.exec(output);
                    device.name = util.format("%s-%s", name[1], pin[1]);
                    device.ip = ip;
                    device.pin = pin[1];
                    device.devicepassword = password;
                    device.keystorepass = storepass;
                    log("Found device: " + device.name + "@" + device.ip);
                    callback(device);

                } else if (code === 127) {
                    log('Error executing cmd: ' + cmd + 
                        '\n  returned with code: ' + 
                        code + '\n  make sure the blackberry:bb10:sdk value in config.json points to your installation of the BB10 Webworks SDK');
                }
                
            });
        });
    }
};
