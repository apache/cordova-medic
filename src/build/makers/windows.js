var shell        = require('shelljs'),
    path         = require('path'),
    n            = require('ncallbacks'),
    fs           = require('fs'),
    mspec        = require('./mobile_spec'),
    couch        = require('../../couchdb/interface'),
    q            = require('q'),
    testRunner   = require('./testRunner'),
    util         = require('util');
    devices      = require('../../../../mobilespec/platforms/windows/cordova/lib/package')
    
module.exports = function(output, sha, entry_point, couchdb_host, test_timeout, build_target) {

    var target_folder = ((build_target == 'store') ? 'windows' : ((build_target == 'store80') ? 'windows80' : 'phone')),
        noBuildMarker = '<!-- no build marker -->',
        manifestFile = path.join('platforms', 'windows', 'build', target_folder, 'debug', 'anycpu', 'AppxManifest.xml');
    
    build_target = (build_target == 'store' || build_target == 'store80') ? 'win' : build_target;
    
    var target = '';
    var targetDevice;
    
    function getDevices() {
        var d = q.defer();
        var listOfDevices = null;
        if(target_folder == 'phone') {
            devices.listDevices().then(function (deviceList){
             listOfDevices = deviceList;
            d.resolve(listOfDevices);
            });
        } else {
            d.resolve();
        }
        return d.promise;
    }
    
    function getRandomDevice(listOfDevices) {
        
        if(target_folder == 'phone') {
            var deviceList = ((listOfDevices).toString()).split(',');
            var deviceNumber = deviceList.length >= 2 ? 1 : 0;
            targetDevice = deviceList[deviceNumber];
            log("Target device: " + targetDevice);
        }
        
        return;
    }
    
    function run() {
        var d = q.defer();
        log('Running app...');
        var target = '';
        
        if(target_folder == 'phone') {
            target = ' --target=' + '"' + targetDevice + '"';
        }
        
        var cmd = '..\\cordova-cli\\bin\\cordova.cmd run windows -- --' + build_target + ' --nobuild' + target,
            logFile = sha + '.log',
            errFile = sha + '.err',
            endFile = sha + '.end',
            runner = 'run.bat';
        
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
            if (fs.existsSync(endFile)){
                clearInterval(waitForRunner);
                log(fs.readFileSync(logFile));
                // read 'cordova run' exit code from endfile, that was written by run.bat
                var exitCode = parseInt(fs.readFileSync(endFile, 'utf-8'), 10);
                if (exitCode > 0){
                    log(fs.readFileSync(errFile));
                    d.reject('Unable to run application. Exit code: ' + exitCode);
                }
                d.resolve();
            }
        }, 1000);
        return d.promise;
    }

    function log(msg) {
        console.log('[WINDOWS] ' + msg + ' (sha: ' + sha + ')');
    }

    function prepareMobileSpec() {
        // make sure windows app got created first.
        var defer = q.defer();
        try {
            if (!fs.existsSync(output)) {
                throw new Error('create must have failed as output path does not exist.');
            }
            var mspec_out = path.join(output, 'www');

            log('Modifying Cordova Mobilespec application at:'+mspec_out);

            mspec(mspec_out,sha,'',entry_point, function(err){
                if(err) {
                    throw new Error('Error while modifying Windows mobile spec application.');
                }

                // specify couchdb server and sha for cordova medic plugin via medic.json
                log('Write medic.json to autotest folder');
                var medic_config='{"sha":"'+sha+'","couchdb":"'+couchdb_host+'"}';
                fs.writeFileSync(path.join(output, '..', '..', 'www','autotest','pages', 'medic.json'),medic_config,'utf-8');
                
                // patch WindowsStoreAppUtils script to allow app run w/out active desktop/remote session
                if (build_target == "store80" || build_target == "store") {
                    log('Patching WindowsStoreAppUtils to allow app to be run in automated mode');
                    shell.cp('-f', path.join(output, '..', '..', '..','medic','src', 'utils', 'EnableDebuggingForPackage.ps1'),
                             path.join(output, 'cordova', 'lib'));
                    shell.sed('-i', /^\s*\$appActivator .*$/gim,
                              '$&\n' +
                              '    powershell ' + path.join(output, 'cordova', 'lib', 'EnableDebuggingForPackage.ps1') + ' $$ID\n' +
                              '    $Ole32 = Add-Type -MemberDefinition \'[DllImport("Ole32.dll")]public static extern int CoAllowSetForegroundWindow(IntPtr pUnk, IntPtr lpvReserved);\' -Name \'Ole32\' -Namespace \'Win32\' -PassThru\n' +
                              '    $Ole32::CoAllowSetForegroundWindow([System.Runtime.InteropServices.Marshal]::GetIUnknownForObject($appActivator), [System.IntPtr]::Zero)',
                              path.join(output, 'cordova', 'lib', 'WindowsStoreAppUtils.ps1'));
                }

                defer.resolve();
            });
        }
        catch (e) {
            defer.reject(e);
        }
        return defer.promise;
    }
    
    function build() {
        log('Building app...');
        
        cmd = '..\\cordova-cli\\bin\\cordova.cmd build windows -- --' + build_target;

        shell.exec(cmd);
        
        fs.appendFileSync(manifestFile, noBuildMarker, 'utf-8');
    }
    
    function testNoBuild() {
        var manifestContent = fs.readFileSync(manifestFile, 'utf-8');
        
        if (manifestContent.indexOf(noBuildMarker) === -1) {
            throw new Error('NoBuild parameter test failed.');
        }
    }
    
    function testTarget() {
        var ps = "powershell" + ' "' + "Get-VM | Where-Object {$_.State –eq 'Running'} " + '"';
        var pscontent = shell.exec(ps);

        if (pscontent.output.indexOf(targetDevice) === -1) {
            throw new Error('Target parameter test failed.');
        }
    }

    return prepareMobileSpec().then(function() {
            shell.cd(path.join(output, '..', '..'));
            return build();
        }).then(getDevices).then(getRandomDevice).then(run).then(function() {
            return testRunner.waitTestsCompleted(sha, 1000 * test_timeout);
        }).then(testNoBuild).then(testTarget);
};