var shell        = require('shelljs'),
    path         = require('path'),
    error_writer = require('./error_writer'),
    n            = require('ncallbacks'),
    fs           = require('fs'),
    mspec        = require('./mobile_spec');

module.exports = function(output, sha, devices, entry_point, couchdb_cfg, callback) {

    function log(msg) {
        console.log('[FIREFOXOS] ' + msg + ' (sha: ' + sha + ')');
    }
      try {
         // make sure firefoxos app got created first.
         if (!fs.existsSync(output)) {
              throw new Error('create must have failed as output path does not exist.');              
         }
         var mspec_out = path.join(output, 'assets', 'www');
         // add the medic configuration (sha,host) to destination folder
         var medic_config='{"sha":"'+sha+'","couchdb":"'+couchdb_cfg.host+'","couchdbext":"'+couchdb_cfg.exthost+'"}';
         fs.writeFileSync(path.join(output, 'assets', 'www','autotest','pages', 'medic.json'),medic_config,'utf-8');
         log('Modifying Cordova firefoxos application.');

         var configFile = path.join(output, 'res', 'xml', 'config.xml');
         fs.writeFileSync(configFile, fs.readFileSync(configFile, 'utf-8').replace(/<content\s*src=".*"/gi, '<content src="' +entry_point + '"'), 'utf-8');
         // make sure the couch db server is whitelisted
         fs.writeFileSync(configFile, fs.readFileSync(configFile, 'utf-8').replace(/<access origin="http:..audio.ibeat.org" *.>/gi,'<access origin="http://audio.ibeat.org" /><access origin="'+couchdb_cfg.host+'" />', 'utf-8'));
     } catch (e) {
         error_writer('firefoxos', sha, 'Exception thrown modifying FirefoxOS mobile spec application.', e.message);
         callback(true);
         return;
     }
}

