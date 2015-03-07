var fs              = require('fs'),
    path            = require('path'),
    buildinfo       = require('./buildinfo'),
    config          = require('./config'),
    windows         = require('./src/build/makers/windows'),
    argv            = require('optimist').argv,
    error_writer    = require('./src/build/makers/error_writer'),
    testcheck       = require('./testchecker'),
    createMedicJson = require('./src/utils/createMedicJson');

// this assumes that you start it in the sandbox

var TEST_DIR = process.cwd().replace(/\\/g, '\\\\'),
    BRANCH = 'master',
    TOOL_DIR = path.join(TEST_DIR, 'cordova-medic'),
    MSPEC_DIR = path.join(TEST_DIR, 'mobilespec'),
    TEST_OK = true;

if (argv.branch) {
    BRANCH = argv.branch;
}

var output_location = path.join(MSPEC_DIR, 'platforms', 'windows');

buildinfo('Windows', BRANCH, function (error, sha) {

    function log(msg) {
        console.log('[WINDOWS] ' + msg + ' (sha: ' + sha + ')');
    }

    function setTargetStoreVersion(version) {
        log('setting target store version to ' + version);

        var configPath = 'mobilespec/config.xml',
            configContent = fs.readFileSync(configPath, "utf8"),
            versionPreference = '<preference name="windows-target-version" value="' + version + '" />';

        configContent = configContent.replace('</widget>', versionPreference + '\r\n</widget>');

        fs.writeFileSync(configPath, configContent, "utf8");
    }

    if (error) {
        TEST_OK = false;
    } else {
        // timeout to execute tests, 10 min by default
        var test_timeout = config.app.timeout || 10 * 60,
            build_target = argv.phone ? "phone" : argv.store80 ? "store80" : "store";

        log(argv);
        log(build_target);

        if (build_target === "store80") {
            //setTargetStoreVersion('8.0'); // this value is used by default
        } else if (build_target === "store") {
            // store target configuration is specified via config.xml
            setTargetStoreVersion('8.1');
        }

        // add medic configuration (sha, host) to destination folder
        createMedicJson(path.join(MSPEC_DIR, 'www'), sha, config);

        windows(output_location, sha, test_timeout, build_target)
            .then(function onSuccess() {
                return testcheck(sha, config.couchdb.uri);
            }, function onError(err) {
                TEST_OK = false;
                error_writer('windows', sha, 'Windows tests execution failed.', err);
            }).then(function (testCheckResult) {
                TEST_OK = testCheckResult;

                if (TEST_OK) {
                    console.log('Windows test execution completed');
                }
            });
    }
});

process.once('exit', function () {
    if (!TEST_OK) {
        process.exit(1);
    }
});
