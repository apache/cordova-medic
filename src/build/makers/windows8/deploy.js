var shell = require('shelljs'),
    q     = require('q');



module.exports = function deploy(path, sha) {
    function log(msg) {
        console.log('[WINDOWS8] [DEPLOY] ' + msg + ' (' + sha + ')');
    }

    function build() {
        var d = q.defer();
        log('compiling the app...');
        // 'restricted' is used to prevent powershell script (part of build.bat) which requires user interaction to run
        var cmd = 'powershell Set-ExecutionPolicy restricted && cordova\\build.bat';
        shell.exec(cmd, {silent:true, async:true}, function(code, output) {
            if (code > 0) {
                log(output);
                d.reject('build failed with code ' + code);
            } else {
                d.resolve();
            }
        });
        return d.promise;
    }

    function addAppDevPackage() {
        var d = q.defer();
        shell.cd('AppPackages');
        var packagesFolder = shell.ls('.');
        for (var i in packagesFolder) {
            // there are 2 items in AppPackages: folder with Add-AppDevPackage script and .appxupload file
            // find folder by extension: for some reasons shelljs 'test -d' returns false
            if (packagesFolder[i].indexOf('.appxupload') == -1) {
                shell.cd(packagesFolder[i]);
                break;
            }
        }
        shell.exec('powershell Set-ExecutionPolicy unrestricted', {silent:false, async:false}, null);

        var cmd = 'powershell "& \'' + shell.pwd() + '\\Add-AppDevPackage.ps1\' -Force"'; // full path is required
        shell.exec(cmd, {silent:false, async:true}, function(code, output) {
            if (code > 0) {
                log(output);
                d.reject('deploy failed with code ' + code);
            } else {
                d.resolve();
            }
        });
        return d.promise;
    }

    shell.cd(path);
    return build().then(addAppDevPackage);
}
