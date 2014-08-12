var fs = require('fs');
var path = require ('path');
var shell = require('shelljs');
var buildinfo = require('./buildinfo');
var config = require('./config');
var windows8  = require('./src/build/makers/windows8');
var argv = require('optimist').argv;
var error_writer = require('./src/build/makers/error_writer');

// this assumes that you start it in the sandbox

var TEST_DIR=process.cwd().replace(/\\/g, '\\\\');
var BRANCH='master';
var TOOL_DIR=path.join(TEST_DIR,'medic');
var MSPEC_DIR=path.join(TEST_DIR,'mobilespec');

var TEST_OK=true;

if(argv.branch) BRANCH=argv.branch;

var output_location = path.join(MSPEC_DIR,'platforms','windows8');
// fixes tests crash when windows universal apps used to test
if (!fs.existsSync(output_location)){
    output_location = path.join(MSPEC_DIR,'platforms','windows');
}

buildinfo('Windows8', BRANCH, function (error, sha ) {

    function log(msg) {
        console.log('[WINDOWS8] ' + msg + ' (sha: ' + sha + ')');
    }

    function setTargetStoreVersion(version) {
        log('setting target store version to ' + version);

        var configPath = 'mobilespec/config.xml';
        configContent = fs.readFileSync(configPath, "utf8");

        var versionPreference = '<preference name="windows-target-version" value="' + version + '" />';
        configContent = configContent.replace ('</widget>', versionPreference + '\r\n</widget>')

        fs.writeFileSync(configPath, configContent, "utf8");
    }

    if(error) {
        TEST_OK=false;
    } else {
        // timeout to execute tests, 10 min by default
        var test_timeout = config.app.timeout ? config.app.timeout : 10 * 60;
        log(argv);
        var build_target = argv.phone ? "phone" : argv.store80 ? "store80" : "store";
        log(build_target);

        if (build_target == "store80") {
            build_target == "store";
            //setTargetStoreVersion('8.0'); // this value is used by default
        } else if (build_target == "store") {
            // store target configuration is specified via config.xml 
            setTargetStoreVersion('8.1');
        }

        windows8(output_location, sha, config.app.entry, config.couchdb.host, test_timeout, build_target).then(function() {
                console.log('Windows8 test execution completed');
            }, function(err) {
                TEST_OK=false;
                error_writer('windows8', sha, 'Windows8 tests execution failed.', err);
            });
    }
});

process.once('exit', function () {
    if(!TEST_OK) process.exit(1);
});

