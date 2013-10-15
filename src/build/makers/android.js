var shell        = require('shelljs'),
    path         = require('path'),
    error_writer = require('./error_writer'),
    n            = require('ncallbacks'),
    deploy       = require('./android/deploy'),
    scan         = require('./android/devices'),
    fs           = require('fs'),
    mspec        = require('./mobile_spec');

module.exports = function(output, sha, devices, entry_point, couchdb_host, callback) {
    function log(msg) {
        console.log('[ANDROID] ' + msg + ' (sha: ' + sha.substr(0,7) + ')');
    }
      try {
          // make sure android app got created first.
          if (!fs.existsSync(output)) {
              throw new Error('create must have failed as output path does not exist.');
          }
          var mspec_out = path.join(output, 'assets', 'www');
          log('Modifying Cordova Mobilespec application at:'+mspec_out);
          mspec(mspec_out,sha,devices,entry_point, function(err){
              if(err) {
                  error_writer('android', sha, 'Error  modifying mobile spec application.', '');
                  callback(true);
              } else {
                  log('Modifying Cordova android application.');
                  // add the sha to the junit reporter
                  var tempJasmine = path.join(output, 'assets', 'www', 'jasmine-jsreporter.js');
                  if (fs.existsSync(tempJasmine)) {
                      fs.writeFileSync(tempJasmine, "var library_sha = '" + sha + "';\n" + fs.readFileSync(tempJasmine, 'utf-8'), 'utf-8');
                  }

                  // modify start page in the config.xml
                  // modify start page in the config.xml
                  var configFile = path.join(output, 'res', 'xml', 'config.xml');


                  var configFile = path.join(output, 'res', 'xml', 'config.xml');
                  fs.writeFileSync(configFile, fs.readFileSync(configFile, 'utf-8').replace(/<content\s*src=".*"/gi, '<content src="' +entry_point + '"'), 'utf-8');
                  // make sure the couch db server is whitelisted
                  fs.writeFileSync(configFile, fs.readFileSync(configFile, 'utf-8').replace(/<access origin="http:..audio.ibeat.org" *.>/gi,'<access origin="http://audio.ibeat.org" /><access origin="'+couchdb_host+'" />', 'utf-8'));
              }
          });
     } catch (e) {
         error_writer('android', sha, 'Exception thrown modifying Android mobile spec application.', e.message);
         callback(true);
         return;
     }
     var pkgname= 'mobilespec';
                    // compile
                    log('Compiling.');
                    var ant = 'cd ' + output + ' && ant clean && ant debug';
                    shell.exec(ant, {silent:true,async:true},function(code, compile_output) {
                        log('Compile exit:'+code);
                        if (code > 0) {
                            error_writer('android', sha, 'Compilation error', compile_output);
                            callback(true);
                        } else {
                            var binary_path = path.join(output, 'bin', pkgname+'-debug.apk');
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

