var path            = require('path'),
    buildinfo       = require('./buildinfo'),
    config          = require('./config'),
    android         = require('./src/build/makers/android'),
    argv            = require('optimist').argv,
    testcheck       = require('./testchecker'),
    error_writer    = require('./src/build/makers/error_writer'),
    createMedicJson = require('./src/utils/createMedicJson');

// this assumes that you start it in the sandbox

var TEST_DIR = process.cwd(),
    BRANCH = 'master',
    MSPEC_DIR = path.join(TEST_DIR, 'mobilespec'),
    TEST_OK = true;

if (argv.branch) {
    BRANCH = argv.branch;
}

var output_location = path.join(MSPEC_DIR, 'platforms', 'android'),
    test_timeout = config.app.timeout || 10 * 60;

buildinfo('Android', BRANCH, function (error, sha) {
    if (error) {
        TEST_OK = false;
    } else {
        // add medic configuration (sha, host) to destination folder
        createMedicJson(path.join(MSPEC_DIR, 'www'), sha, config);

        android(output_location, sha, test_timeout)
            .then(function onSuccess() {
                return testcheck(sha, config.couchdb.uri);
            }, function onError(err) {
                TEST_OK = false;
                error_writer('android', sha, 'Android tests execution failed.', err);
            }).then(function (testCheckResult) {
                TEST_OK = testCheckResult;

                if (TEST_OK) {
                    console.log('Android test execution completed');
                }
            });
    }
});

process.once('exit', function () {
    if (!TEST_OK) {
        process.exit(1);
    }
});
