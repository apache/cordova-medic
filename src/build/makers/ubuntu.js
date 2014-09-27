var shell        = require('shelljs'),
    path         = require('path'),
    error_writer = require('./error_writer'),
    n            = require('ncallbacks'),
    fs           = require('fs'),
    cp           = require('child_process'),
    mspec        = require('./mobile_spec');

module.exports = function(output, sha, devices, entry_point, couchdb_cfg, callback) {
    function log(msg) {
        console.log('[UBUNTU] ' + msg + ' (sha: ' + sha + ')');
    }

    try {
        // make sure android app got created first.
        if (!fs.existsSync(output)) {
            throw new Error('create must have failed as output path does not exist.');
        }

        var mspec_out = path.join(output, 'www');

        // add the medic configuration (sha,host) to destination folder
        var medic_config = '{"sha":"'+sha+'","couchdb":"'+couchdb_cfg.host+'","couchdbext":"'+couchdb_cfg.exthost+'"}';
        fs.writeFileSync(path.join(output, 'www', 'autotest', 'pages', 'medic.json'),medic_config,'utf-8');
        log('Modifying Cordova android application.');
    } catch (e) {
        error_writer('ubuntu', sha, 'Exception thrown modifying Ubuntu mobile spec application.', e.message);
        callback(true);
        return;
    }
    var pkgname= 'mobilespec';
    log('Compiling.');

    var build = 'umask 022; cd ' + path.join(output, '..', '..') + '; '+ path.join(output, 'cordova','build') + ' --debug';
    shell.exec(build, {silent:true, async:true}, function(code, compile_output) {
        log('Compile exit: ' + code);

        if (code > 0) {
            error_writer('ubuntu', sha, 'Compilation error', compile_output);
            callback(true);
        } else {
            var run = 'umask 022; cd ' + path.join(output, '..', '..') + '; '+ path.join(output, 'cordova','run') + ' --emulate';
            log('Running.');

            var app = cp.exec('bash -c "' + run + '"');

            function appKill() {
                shell.exec('kill -TERM -' + process.pid, {silent:true, async:true});
                app.kill();
            }
            var timer = setTimeout(function() {
                log('Mobile-spec timed out.');
                callback(true);
                appKill();
            }, 1000 * 60 * 15);

            app.stdout.on('data', function(stdout) {
                var buf = stdout.toString();
                log(buf);
                if (buf.indexOf('[[[ TEST FAILED ]]]') > -1) {
                    log('Mobile-spec finished with failure');
                    clearTimeout(timer);
                    callback(true);
                    appKill();
                } else if (buf.indexOf('couch returned some balltastic info.') > -1) {
                    log('couch returned some balltastic info.');
                    clearTimeout(timer);
                    callback(true);
                    appKill();
                }else if (buf.indexOf('>>> DONE <<<') > -1) {
                    log('Mobile-spec finished');
                    clearTimeout(timer);
                    callback(false);
                    appKill();
                } else if (buf.indexOf('Test Results URL') > -1 && buf.indexOf('<<<end test result>>>') > -1) {
                    var msg = buf.slice(buf.indexOf('Test Results URL'), buf.indexOf('<<<end test result>>>'))
                    console.log(msg);
                }
            });
        }
    });
}

