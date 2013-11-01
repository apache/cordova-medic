var shell = require('shelljs'),
    q     = require('q');

module.exports = function deploy(path, sha, devices){
    function log(msg) {
        console.log('[WP8] [DEPLOY] ' + msg + ' (' + sha + ')');
    }

    var cmd = 'cd ' + path + '\\..\\..\\ && node ..\\cordova-cli\\bin\\cordova run';
    // run option: --device, --emulator, other
    if (devices !== '') {
        cmd += ' --' + devices;
    }
    cmd += ' wp8';
    log ('starting deploy via command: ' + cmd);
    var defer = q.defer();
    shell.exec(cmd, {silent:true, async:true}, function(code, output) {
        if (code > 0) {
            defer.reject('deploy failed with code: ' + code);
        }
        else {
            defer.resolve();
        }
    });
    return defer.promise;
}