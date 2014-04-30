var shell        = require('shelljs'),
    path         = require('path'),
    error_writer = require('./error_writer'),
    n            = require('ncallbacks'),
    deploy       = require('./blackberry10/deploy'),
    scan         = require('./blackberry10/devices'),
    fs           = require('fs'),
    mspec        = require('./mobile_spec');

module.exports = function(output, sha, entry_point, couchdb_host, callback) {
    function log(msg) {
        console.log('[BLACKBERRY] ' + msg + ' (sha: ' + sha + ')');
    }
      try {
          // make sure blackberry app got created first.
          if (!fs.existsSync(output)) {
              throw new Error('create must have failed as output path does not exist.');
          }
          var mspec_out = path.join(output, 'www');
          log('Modifying Cordova Mobilespec application at:' + mspec_out);
          mspec(mspec_out, sha, '', entry_point, function(err){
              if(err) {
                  error_writer('blackberry', sha, 'Error  modifying mobile spec application.', '');
                  callback(true);
              } else {
                  log('Modifying Cordova blackberry application.');
                  // add the sha to the junit reporter
                  var tempJasmine = path.join(output, 'www', 'jasmine-jsreporter.js');
                  if (fs.existsSync(tempJasmine)) {
                      fs.writeFileSync(tempJasmine, "var library_sha = '" + sha + "';\n" + fs.readFileSync(tempJasmine, 'utf-8'), 'utf-8');
                  }

                  // modify start page in the config.xml
                  var configFile = path.join(output, 'config.xml');
                  fs.writeFileSync(configFile, fs.readFileSync(configFile, 'utf-8').replace(/<content\s*src=".*"/gi, '<content src="' +entry_point + '"'), 'utf-8');
                  // make sure the couch db server is whitelisted
                  fs.writeFileSync(configFile, fs.readFileSync(configFile, 'utf-8').replace(/<access origin="http:..audio.ibeat.org" *.>/gi,'<access subdomains="true" origin="http://apache.org" /><access subdomains="true" origin="https://apache.org"/><access subdomains="true" origin="http://audio.ibeat.org" /><access subdomains="true" origin="'+couchdb_host+'" />', 'utf-8'));
              }
          });
     } catch (e) {
         error_writer('blackberry', sha, 'Exception thrown modifying BlackBerry mobile spec application.', e.message);
         callback(true);
         return;
     }
     var pkgname= 'mobilespec';
     // build and deploy to device 
     log('build and deploy.');
     deploy(output, sha);
};

