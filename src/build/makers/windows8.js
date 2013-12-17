var shell        = require('shelljs'),
    path         = require('path'),
    n            = require('ncallbacks'),
    deploy       = require('./windows8/deploy'),
    fs           = require('fs'),
    mspec        = require('./mobile_spec'),
    couch        = require('../../couchdb/interface'),
    q            = require('q');


module.exports = function(output, sha, entry_point, couchdb_host, test_timeout, callback) {

    var packageName = 'org.apache.mobilespec';
    var packageInfo = {};

    function query_for_sha(sha, callback) {

        var view = 'sha?key="' + sha + '"';
        // get build errors from couch for each repo
        couch.mobilespec_results.query_view('results', view, function(error, result) {
            if (error) {
                console.error('query failed for mobilespec_results', error);
                callback(true, error);
                return;
            }
            callback(false, result);
        });
    }

    function isTestsCompleted(sha, callback) {
        query_for_sha(sha, function(isFailed, res) {
            // return True if there is no error and there are test results in db for specified sha
            callback(!isFailed && res.rows.length > 0);
        });
    }

    function waitTestsCompleted(sha, timeoutMs) {
       var defer = q.defer();
       var startTime = Date.now(),
           timeoutTime = startTime + timeoutMs,
           checkInterval = 10 * 1000; // 10 secs

        var testFinishedFn = setInterval(function(){

            isTestsCompleted(sha, function(isSuccess) {
                // if tests are finished or timeout
                if (isSuccess || Date.now() > timeoutTime) {
                    clearInterval(testFinishedFn);
                    isSuccess ? defer.resolve() : defer.reject('timed out');
                }
            });
        }, checkInterval);
        return defer.promise;
    }


    function log(msg) {
        console.log('[WINDOWS8] ' + msg + ' (sha: ' + sha + ')');
    }

    function prepareMobileSpec() {
        // make sure windows8 app got created first.
        var defer = q.defer();
        try {
            if (!fs.existsSync(output)) {
                throw new Error('create must have failed as output path does not exist.');
            }
            var mspec_out = path.join(output, 'www');

            log('Modifying Cordova Mobilespec application at:'+mspec_out);

            mspec(mspec_out,sha,'',entry_point, function(err){
                if(err) {
                    throw new Error('Error thrown modifying Windows8 mobile spec application.');
                }

                log('Modifying Cordova windows8 application.');
                // add the sha to the junit reporter
                var tempJasmine = path.join(output, 'www', 'jasmine-jsreporter.js');
                if (fs.existsSync(tempJasmine)) {
                    fs.writeFileSync(tempJasmine, "var library_sha = '" + sha + "';\n" + fs.readFileSync(tempJasmine, 'utf-8'), 'utf-8');
                }

                // modify start page
                var manifest = fs.readFileSync(path.join(output, 'package.appxmanifest')).toString().split('\n');
                for (var i in manifest) {
                    if (manifest[i].indexOf('www/index.html') != -1) {
                        log('Modifying start page to ' + entry_point);
                        manifest[i] = manifest[i].replace('www/index.html', entry_point);
                        break;
                    }
                }
                // set permanent package name to prevent multiple installations
                for (var i in manifest) {
                    if (manifest[i].indexOf('<Identity') != -1) {
                        manifest[i] = manifest[i].replace(/Name=".+?"/gi, 'Name="'+packageName+'"');
                        break;
                    }
                }

                manifest = manifest.join('\n');

                fs.writeFileSync(path.join(output, 'package.appxmanifest'), manifest);

                // make sure the couch db server is whitelisted
                var configFile = path.join(output, 'www', 'config.xml');
                fs.writeFileSync(configFile, fs.readFileSync(configFile, 'utf-8').replace(
                  /<access origin="http:..audio.ibeat.org" *.>/gi,'<access origin="http://audio.ibeat.org" /><access origin="'+couchdb_host+'" />', 'utf-8'));

                // specify couchdb server and sha for cordova medic plugin
                var medicPluginCore = path.join(output, '..', '..', 'plugins', 'org.apache.cordova.core.medic', 'www', 'medic.js');
                var content = fs.readFileSync(medicPluginCore).toString();
                content = content.replace(
                    /this\.couchdb = \'.*\'\;/, "this.couchdb = '" + couchdb_host + "';").replace(
                    /this\.sha = \'.*\'\;/, "this.sha = '" + sha + "';"
                );
                fs.writeFileSync(medicPluginCore, content);
                defer.resolve();
            });
        }
        catch (e) {
            defer.reject(e);
        }

        return defer.promise;
    }

    function parsePackageInfo() {
        var d = q.defer();
        var cmd = 'powershell Get-AppxPackage ' + packageName;
        log(cmd);
        shell.exec(cmd, {silent:true, async:true}, function(code, output) {
            log(output);
            if (code > 0) {
                d.reject('getting package info failed with code ' + code);
            } else {
                output = output.split('\n');
                for (var i = 0; i < output.length; ++i) {
                    if (output[i].indexOf(':') == -1) continue;
                    var key = output[i].split(':')[0].trim();
                    var value = output[i].split(':')[1].trim();
                    while (output[i + 1] && output[i + 1].indexOf(':') == -1) value += output[++i].trim();
                    packageInfo[key] = value;
                }
                d.resolve(packageInfo['PackageFullName']);
            }
        });

        return d.promise;
    }

    function removeInstalledPackage(fullName) {
        var d = q.defer();
        if (fullName) {
            log('Application with the same name is already installed, removing...');
            var cmd = 'powershell Remove-AppxPackage ' + fullName;
            log(cmd);
            shell.exec(cmd, {async:true, silent:true}, function(code, output) {
                log(output);
                if (code > 0) {
                    d.reject('package removing failed with code ' + code);
                }
                else {
                    d.resolve();
                }
            });
        }
        else {
            d.resolve();
        }

        return d.promise;
    }

    function getAppId() {
        var cmd = 'powershell (get-appxpackagemanifest (get-appxpackage ' + packageName +')).package.applications.application.id';
        var d = q.defer();
        log(cmd);
        shell.exec(cmd, {silent:true, async:true}, function(code, output) {
            log(output);
            if (code > 0) {
                d.reject('unable to get installed app id');
            } else {
                d.resolve(packageInfo['PackageFamilyName'] + '!' + output);
            }
        });

        return d.promise;
    }

    function runApp(appId) {
        var utilsDir = '\\..\\..\\..\\medic\\src\\utils';
        shell.cd(output + utilsDir);
        var d = q.defer();
        // the following hack with explorer.exe usage is required to start the tool w/o Admin privileges;
        // in other case there will be the 'app can't open while File Explorer is running with administrator privileges ...' error

        var runner = path.join(output, 'AppPackages', 'runLocal.bat'),
            storeAppLauncher = path.join(output, utilsDir, 'StoreAppLauncher.exe');
        fs.writeFileSync(runner, storeAppLauncher + ' ' + appId, 'utf-8');


        var cmd = 'explorer ' + runner;
        log(cmd);
        shell.exec(cmd, {silent:true,async:true}, function(code, output) {
            // TODO: even if the command succeeded, code is '1'. must be investigated
            // temporary added check for not empty output
            log(output);
            if (code > 0 && output != "") {
                d.reject('unable to run ' + appId);
            } else {
                d.resolve();
            }
        });

        return d.promise;
    }

    return prepareMobileSpec().then(parsePackageInfo).then(removeInstalledPackage).then(function() {
            return deploy(output, sha);
        }).then(parsePackageInfo).then(getAppId).then(runApp).then(function() {
            return waitTestsCompleted(sha, 1000 * test_timeout);
        });
}
