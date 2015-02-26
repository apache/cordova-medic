var shell        = require('shelljs'),
    path         = require('path'),
    error_writer = require('./error_writer'),
    fs           = require('fs'),
    q            = require('q'),
    testRunner   = require('./testRunner'),
    device       = require('../../../../mobilespec/platforms/android/cordova/lib/device'),
    emulator     = require('../../../../mobilespec/platforms/android/cordova/lib/emulator');

module.exports = function (output, sha, test_timeout) {

    var noBuildMarker = '<!-- no build marker -->',
        manifestFile = path.join('platforms', 'android', 'bin', 'AndroidManifest.xml'),
        mobilespecPath = path.join(output, '..', '..');

    function log(msg) {
        console.log('[ANDROID] ' + msg + ' (sha: ' + sha + ')');
    }

    function build() {
        var d = q.defer(),
            build_cmd = path.join('..', 'cordova-cli', 'bin', 'cordova') + ' build -- --debug --ant';

        log('Building...');

        shell.exec(build_cmd, {
            silent : true,
            async : true
        }, function (code, output) {
            if (code > 0) {
                d.reject('Build error! Exit code: ' + code + ', output: \n ' + output);
            } else {
                try {
                    // appending no-build marker so that we could check later
                    // that `cordova run -- --nobuild` works
                    fs.appendFileSync(manifestFile, noBuildMarker, 'utf-8');
                } catch (err) {
                    log('Error while appending no-build marker to android manifest');
                }
                d.resolve();
            }
        });

        return d.promise;
    }

    // makes sure if there is emulator started
    // if there isn't, starts one
    // if there are no emulator images, rejects promise
    function prepareEmulator() {
        return emulator.list_images()
            .then(function (images) {
                return (!images || images.length === 0) ? q.reject('No emulator images detected, please create one. You can do so by using \'android avd\' command.') : emulator.list_started();
            })
            .then(function (started) {
                if (!started || started.length === 0) {
                    return emulator.best_image()
                        .then(function (best) {
                            shell.cd(path.join(mobilespecPath, '..'));
                            return emulator.start(best.name);
                        })
                        .then(function () {
                            shell.cd(mobilespecPath);
                        });
                }
            });
    }

    // makes sure if there is device connected
    // if there are no devices, starts an emulator
    function prepareDevice() {
        return device.list().then(function (device_list) {
            if (!device_list || device_list.length === 0) {
                return prepareEmulator();
            }
        });
    }

    function run() {
        var d = q.defer();
        log('Running app...');
        var cmd = path.join('..', 'cordova-cli', 'bin', 'cordova') + ' run android -- --nobuild';
        shell.exec(cmd, {
            silent : true,
            async : true
        }, function (code, output) {
            if ((code > 0) || (output.indexOf('ERROR') >= 0)) {
                log('Error launching mobile-spec on android, code: ' + code + ', output:\n' + output);
                d.reject('Error launching mobile-spec on android');
            } else {
                d.resolve();
            }
        });
        return d.promise;
    }

    function testNoBuild() {
        try {
            var manifestContent = fs.readFileSync(manifestFile, 'utf-8');
            if (manifestContent.indexOf(noBuildMarker) === -1) {
                throw new Error('NoBuild parameter test failed.');
            }
        } catch (err) {
            log('error in testNoBuild: ' + JSON.stringify(err));
        }
    }

    shell.cd(mobilespecPath);

    return build()
        .then(prepareDevice)
        .then(run)
        .then(function () {
            log('Waiting for tests to complete...');
            return testRunner.waitTestsCompleted(sha, 1000 * test_timeout);
        }).then(testNoBuild);
};
