var shell        = require('shelljs'),
    path         = require('path'),
    error_writer = require('./error_writer'),
    n            = require('ncallbacks'),
    deploy       = require('./android/deploy'),
    scan         = require('./android/devices'),
    fs           = require('fs'),
    mspec        = require('./mobile_spec');

module.exports = function(output, sha, devices, entry_point, couchdb_cfg, callback) {
    function log(msg) {
        console.log('[ANDROID] ' + msg + ' (sha: ' + sha + ')');
    }
      try {
         // make sure android app got created first.
         if (!fs.existsSync(output)) {
              throw new Error('create must have failed as output path does not exist.');
         }
         var mspec_out = path.join(output, 'assets', 'www');
         // add the medic configuration (sha,host) to destination folder
         var medic_config='{"sha":"'+sha+'","couchdb":"'+couchdb_cfg.host+'","couchdbext":"'+couchdb_cfg.exthost+'"}';
         fs.writeFileSync(path.join(output, 'assets', 'www','autotest','pages', 'medic.json'),medic_config,'utf-8');
         log('Modifying Cordova android application.');

         var configFile = path.join(output, 'res', 'xml', 'config.xml');
         fs.writeFileSync(configFile, fs.readFileSync(configFile, 'utf-8').replace(/<content\s*src=".*"/gi, '<content src="' +entry_point + '"'), 'utf-8');
         // make sure the couch db server is whitelisted
         fs.writeFileSync(configFile, fs.readFileSync(configFile, 'utf-8').replace(/<access origin="http:..audio.ibeat.org" *.>/gi,'<access origin="http://audio.ibeat.org" /><access origin="'+couchdb_cfg.host+'" />', 'utf-8'));
     } catch (e) {
         error_writer('android', sha, 'Exception thrown modifying Android mobile spec application.', e.message);
         callback(true);
         return;
     }
     var pkgname= 'mobilespec';
                    // compile
                    log('Compiling.');
                    var ant = 'cd ' + output + ' && '+path.join('.','cordova','build')+' --debug';
                    shell.exec(ant, {silent:true,async:true},function(code, compile_output) {
                        log('Compile exit:'+code);
                        if (code > 0) {
                            error_writer('android', sha, 'Compilation error', compile_output);
                            callback(true);
                        } else {
                            var binary_path = path.join(output, 'bin', pkgname+'-debug.apk');
                            if( !fs.existsSync(binary_path)){
                              binary_path=path.join(output, 'ant-build', pkgname+'-debug.apk');
                            }
                            var package = 'org.apache.'+pkgname;
                            if (devices) {
                                // already have a specific set of devices to deploy to
                                log('deploying to provided devices:'+devices);
                                deploy(sha, devices, binary_path, package, callback);
                            } else {
                                // get list of connected devices
                                scan(function(err, devices) {
                                    if (err) {
                                        // Could not obtain device list...
                                        var error_message = devices;
                                        log(error_message);
                                        callback(true);
                                    } else {
                                        log('deploying to discovered devices:'+devices);
                                        deploy(sha, devices, binary_path, package, callback);
                                    }
                                });
                            }
                        }
                    });

}

