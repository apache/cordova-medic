
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
var path         = require('path'),
    shell        = require('shelljs'),
    error_writer = require('../error_writer'),
    cp           = require('child_process');

var root = path.join(__dirname, '..', '..', '..', '..');
var fruitstrap = path.join(root, 'node_modules', 'ios-deploy', 'ios-deploy');
var failures=false;
var logged_url=false;

function kill(process, buf, sha, device_id) {
    if (buf.indexOf('[[[ TEST FAILED ]]]') > -1) {
        process.kill();
        failures=true;
        console.log('Tests failed on '+device_id);
        return true;
    } else if (buf.indexOf('>>> DONE <<<') > -1) {
        process.kill();
        console.log('Test complete on '+device_id);
        return true;
    } else if ((buf.indexOf('Assertion failed: (AMDeviceStartService') > -1) || (buf.indexOf('AMDeviceInstallApplication failed') > -1)) {
        // Deployment failed.
        error_writer('ios', sha, 'unknown', device_id, 'Deployment failed.', 'AMDeviceInstallApplication failed');
        process.kill();
        failures=true;
        return true;
    } else if (!logged_url && buf.indexOf(' <<<end test result>>>')>-1 && buf.indexOf('Test Results URL') >-1) {
        var msgend=buf.indexOf(' <<<end test result>>>');
        var msgstart =buf.indexOf('Test Results URL');
        var msg = buf.slice(msgstart,msgend);
        console.log(msg);
        logged_url=true;
    }
    return false;
}

function run_through(sha, devices, bundlePath, bundleId, callback) {
    function log(msg) {
        console.log('[IOS] [DEPLOY] ' + msg + ' (' + sha + ')');
    }
    var d = devices.shift();
    if (d) {
        logged_url=false;

            log('Install + deploy on ' + d);
            var args = ['--id=' + d, '--bundle=' + bundlePath, '--debug --device'];
            var buf = '';
            var fruit = cp.spawn(fruitstrap, args);
            // set up a timeout in case mobile-spec doesnt deploy or run
            var timer = setTimeout(function() {
                fruit.kill();
                failures=true;
                log('Mobile-spec timed out on ' + d + ', continuing.');
                // TODO: write out an error if it times out
                run_through(sha, devices, bundlePath, bundleId, callback);
            }, 1000 * 60 * 6);

            // when fruitstrap is done, kill the process and go on to the next device 
            fruit.stdout.on('data', function(stdout) {
                buf += stdout.toString();
                if (kill(fruit, buf, sha, d)) {
                    clearTimeout(timer);
                    run_through(sha, devices, bundlePath, bundleId, callback);
                }
            });
            fruit.stderr.on('data', function(stderr) {
                buf += stderr.toString();
                if (kill(fruit, buf, sha, d)) {
                    clearTimeout(timer);
                    run_through(sha, devices, bundlePath, bundleId, callback);
                }
            });
    } else {
        callback(failures);
    }
}

// deploy and run a specified bundle to specified devices
module.exports = function deploy(sha, devices, bundlePath, bundleId, callback) {
    function log(msg) {
        console.log('[IOS] [DEPLOY] ' + msg + ' (' + sha.substr(0,7) + ')');
    }
    if (devices.length > 0) {
        log('Devices: ' + devices.join(', '));
        run_through(sha, devices, bundlePath, bundleId, callback);
    } else {
        log('No iOS devices detected.');
        callback(true);
    }
};

