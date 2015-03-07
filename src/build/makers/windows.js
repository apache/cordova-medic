var shell      = require('shelljs'),
    path       = require('path'),
    fs         = require('fs'),
    q          = require('q'),
    testRunner = require('./testRunner'),
    util       = require('util');

module.exports = function (output, sha, test_timeout, build_target) {

    var target_folder = ((build_target === 'store') ? 'windows' : ((build_target === 'store80') ? 'windows80' : 'phone')),
        noBuildMarker = '<!-- no build marker -->',
        manifestFile = path.join('platforms', 'windows', 'build', target_folder, 'debug', 'anycpu', 'AppxManifest.xml');

    build_target = (build_target === 'store' || build_target === 'store80') ? 'win' : build_target;

    function log(msg) {
        console.log('[WINDOWS] ' + msg + ' (sha: ' + sha + ')');
    }

    function run() {
        var d = q.defer(),
            cmd = '..\\cordova-cli\\bin\\cordova.cmd run windows -- --' + build_target + ' --nobuild',
            logFile = sha + '.log',
            errFile = sha + '.err',
            endFile = sha + '.end',
            runner = 'run.bat';

        log('Running app...');

        // create commands that should be started from bat file:
        //  1. cd to project folder
        //  2. start 'cmd' defined earlier and redirect its stdout and stderr to files
        //  3. print exit code of 'cmd' to 'endfile'
        var runnerContent = util.format('cd /d "%s"\n%s 1>%s 2>%s & echo "%ERRORLEVEL%" >%s',
            shell.pwd(), cmd, logFile, errFile, endFile);

        fs.writeFileSync(runner, runnerContent, 'utf-8');

        // the following hack with explorer.exe usage is required to start the tool w/o Admin privileges;
        // in other case there will be the 'app can't open while File Explorer is running with administrator privileges ...' error
        shell.exec('explorer ' + runner, {async: false});

        // Due to explorer, that don't redirects output of child cmd process
        // and exits immediately after starting bat file we are waiting for
        // special marker - 'endfile' - to be created when cordova run exits.
        var waitForRunner = setInterval(function () {
            if (fs.existsSync(endFile)) {
                clearInterval(waitForRunner);
                log(fs.readFileSync(logFile));
                // read 'cordova run' exit code from endfile, that was written by run.bat
                var exitCode = parseInt(fs.readFileSync(endFile, 'utf-8'), 10);
                if (exitCode > 0) {
                    log(fs.readFileSync(errFile));
                    d.reject('Unable to run application. Exit code: ' + exitCode);
                }
                d.resolve();
            }
        }, 1000);
        return d.promise;
    }

    function prepareMobileSpec() {
        // make sure windows app got created first.
        if (!fs.existsSync(output)) {
            throw new Error('create must have failed as output path does not exist.');
        }
        // patch WindowsStoreAppUtils script to allow app run w/out active desktop/remote session
        if (build_target === "win") {
            log('Patching WindowsStoreAppUtils to allow app to be run in automated mode');
            shell.cp('-f', path.join(output, '..', '..', '..', 'cordova-medic', 'src', 'utils', 'EnableDebuggingForPackage.ps1'),
                     path.join(output, 'cordova', 'lib'));
            shell.sed('-i', /^\s*\$appActivator .*$/gim,
                      '$&\n' +
                      '    powershell ' + path.join(output, 'cordova', 'lib', 'EnableDebuggingForPackage.ps1') + ' $$ID\n' +
                      '    $Ole32 = Add-Type -MemberDefinition \'[DllImport("Ole32.dll")]public static extern int CoAllowSetForegroundWindow(IntPtr pUnk, IntPtr lpvReserved);\' -Name \'Ole32\' -Namespace \'Win32\' -PassThru\n' +
                      '    $Ole32::CoAllowSetForegroundWindow([System.Runtime.InteropServices.Marshal]::GetIUnknownForObject($appActivator), [System.IntPtr]::Zero)',
                      path.join(output, 'cordova', 'lib', 'WindowsStoreAppUtils.ps1'));
        }
    }

    function build() {
        log('Building app...');

        var cmd = '..\\cordova-cli\\bin\\cordova.cmd build windows -- --' + build_target;
        shell.exec(cmd);

        fs.appendFileSync(manifestFile, noBuildMarker, 'utf-8');
    }

    function testNoBuild() {
        var manifestContent = fs.readFileSync(manifestFile, 'utf-8');

        if (manifestContent.indexOf(noBuildMarker) === -1) {
            throw new Error('NoBuild parameter test failed.');
        }
    }

    prepareMobileSpec();
    shell.cd(path.join(output, '..', '..'));
    build();

    return run().then(function () {
            return testRunner.waitTestsCompleted(sha, 1000 * test_timeout);
        }).then(testNoBuild);
};
