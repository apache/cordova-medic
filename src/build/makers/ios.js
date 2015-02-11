var shell        = require('shelljs'),
    path         = require('path'),
    deploy       = require('./ios/deploy'),
    scan         = require('./ios/devices'),
    error_writer = require('./error_writer'),
    config       = require('../../../config'),
    fs           = require('fs');
    mspec        = require('./mobile_spec');

var keychain_location = config.ios.keychainLocation;
var keychain_password = config.ios.keychainPassword;


module.exports = function(output,lib_location,test_dir, sha, devices, entry_point, couchdb_cfg, callback) {
    function log(msg) {
        console.log('[IOS] ' + msg + ' (sha: ' + sha + ')');
    }
    log('starting iOS prepare');
    try {
        var projectWww = path.join(output, 'www');
        // add the medic configuration (sha,host) to destination folder
        var medic_config='{"sha":"'+sha+'","couchdb":"'+couchdb_cfg.host+'","couchdbext":"'+couchdb_cfg.exthost+'"}';
        fs.writeFileSync(path.join(output, '..', '..', 'www', 'medic.json'),medic_config,'utf-8');

        //  modify config.xml
        var configFile = path.join(output, 'mobilespec', 'config.xml');
        fs.writeFileSync(configFile, fs.readFileSync(configFile, 'utf-8').replace(/<content\s*src=".*"/gi, '<content src="'+entry_point+'"'), 'utf-8');
        // make sure the couch db server is whitelisted
        fs.writeFileSync(configFile, fs.readFileSync(configFile, 'utf-8').replace(/<access origin="http:..audio.ibeat.org" *.>/gi,'<access origin="http://audio.ibeat.org" /><access origin="'+couchdb_cfg.host+'" />', 'utf-8'));

    } catch(e) {
        error_writer('ios', sha, 'Exception thrown modifying mobile spec application for iOS.', e.message);
        callback(true);
        return;
    }
    // compile
    log('Compiling.');
    log(output);

    var mobileSpecDir = path.join(output, '..', '..');
    log(mobileSpecDir);

    var buildCommand = 'cd ' + mobileSpecDir + ' && ./cordova build';
    log(buildCommand);
    var build = shell.exec(buildCommand, {silent: false});
    if (build.code > 0) {
        error_writer('ios', sha, 'Compilation error.', build.output);
        callback(true);
    }

    var runCommand = 'cd ' + mobileSpecDir + ' && ./cordova run';
    log(runCommand);
    var run = shell.exec(runCommand, {silent: false});
    if (run.code > 0) {
        error_writer('ios', sha, 'Compilation error.', run.output);
        callback(true);
    }
}
