var path            = require('path'),
    buildinfo       = require('./buildinfo'),
    config          = require('./config'),
    wp8             = require('./src/build/makers/wp8'),
    argv            = require('optimist').argv,
    error_writer    = require('./src/build/makers/error_writer'),
    testcheck       = require('./testchecker'),
    createMedicJson = require('./src/utils/createMedicJson');

// this assumes that you start it in the sandbox

var TEST_DIR = process.cwd().replace(/\\/g, '\\\\'),
    BRANCH = 'master',
    TOOL_DIR = path.join(TEST_DIR, 'medic'),
    MSPEC_DIR = path.join(TEST_DIR, 'mobilespec'),
    TEST_OK = true;

if (argv.branch) {
    BRANCH = argv.branch;
}

var output_location = path.join(MSPEC_DIR, 'platforms', 'wp8');

buildinfo('WP8', BRANCH, function (error, sha) {
    if (error) {
        TEST_OK = false;
    } else {
        // add medic configuration (sha, host) to destination folder
        createMedicJson(path.join(MSPEC_DIR, 'www'), sha, config);

        // timeout to execute tests, 10 min by default
        var test_timeout = config.app.timeout || 10 * 60;

        wp8(output_location, sha, config.wp8.target, config.app.entry, test_timeout)
            .then(function onSuccess() {
                return testcheck(sha, config.couchdb.host);
            }, function onError(err) {
                TEST_OK = false;
                error_writer('wp8', sha, 'WP8 tests execution failed.', err);
            }).then(function (testCheckResult) {
                TEST_OK = testCheckResult;

                if (TEST_OK) {
                    console.log('WP8 test execution completed');
                }
            });
    }
});

process.once('exit', function () {
    if (!TEST_OK) {
        process.exit(1);
    }
});
