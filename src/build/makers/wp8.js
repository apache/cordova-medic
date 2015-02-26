var shell      = require('shelljs'),
    path       = require('path'),
    fs         = require('fs'),
    mspec      = require('./mobile_spec'),
    q          = require('q'),
    testRunner = require('./testRunner');

module.exports = function (output, sha, devices, entry_point, test_timeout, callback) {

    function log(msg) {
        console.log('[WP8] ' + msg + ' (sha: ' + sha + ')');
    }

    function deploy(path, sha, devices) {
        var cmd = 'cd ' + path + '\\..\\..\\ && node ..\\cordova-cli\\bin\\cordova run',
            defer = q.defer();
        // run option: --device, --emulator, other
        if (devices !== '') {
            cmd += ' --' + devices;
        }
        cmd += ' wp8';
        log('starting deploy via command: ' + cmd);
        shell.exec(cmd, {silent: true, async: true}, function (code, output) {
            if (code > 0) {
                defer.reject('deploy failed with code: ' + code);
            } else {
                defer.resolve();
            }
        });
        return defer.promise;
    }

    function prepareMobileSpec() {
        // make sure wp8 app got created first.
        var defer = q.defer(),
            mspec_out = path.join(output, 'www');
        try {
            if (!fs.existsSync(output)) {
                throw new Error('create must have failed as output path does not exist.');
            }

            log('Modifying Cordova Mobilespec application at: ' + mspec_out);
            mspec(mspec_out, sha, devices, entry_point, function (err) {
                if (err) {
                    throw new Error('Error thrown modifying WP8 mobile spec application.');
                }

                log('Modifying Cordova wp8 application.');
                // add the sha to the junit reporter
                var tempJasmine = path.join(output, 'www', 'jasmine-jsreporter.js');
                if (fs.existsSync(tempJasmine)) {
                    fs.writeFileSync(tempJasmine, "var library_sha = '" + sha + "';\n" + fs.readFileSync(tempJasmine, 'utf-8'), 'utf-8');
                }

                // set permanent guid to prevent multiple installations
                var guid = '{8449DEEE-16EB-4A4A-AFCC-8446E8F06FF7}',
                    appManifestXml = path.join(output, 'Properties', 'WMAppManifest.xml'),
                    xml = fs.readFileSync(appManifestXml).toString().split('\n');
                for (var i in xml) if (xml[i].indexOf('<App') != -1) {
                    if (xml[i].toLowerCase().indexOf('productid') != -1) {
                        var index = xml[i].toLowerCase().indexOf('productid');
                        var spaceIndex = xml[i].indexOf(' ', index);
                        var stringAsArray = xml[i].split('');
                        stringAsArray.splice(index, spaceIndex - index);
                        xml[i] = stringAsArray.join('');
                    }
                    xml[i] = xml[i].substr(0, xml[i].length - 1);
                    xml[i] += ' ProductID="' + guid + '">';
                    break;
                }
                fs.writeFileSync(appManifestXml, xml.join('\n'));

                defer.resolve();
            });
        }
        catch (e) {
            defer.reject(e);
        }

        return defer.promise;
    }

    return prepareMobileSpec()
        .then(function() {
            return deploy(output, sha, devices);
        }).then(function() {
            return testRunner.waitTestsCompleted(sha, 1000 * test_timeout);
        });
};
