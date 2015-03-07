var path            = require('path'),
    buildinfo       = require('./buildinfo'),
    config          = require('./config'),
    ios             = require('./src/build/makers/ios'),
    argv            = require('optimist').argv,
    testcheck       = require('./testchecker'),
    createMedicJson = require('./src/utils/createMedicJson');

// this assumes that you start it in the sandbox

var branch = 'master',
    mspec_dir = path.join(process.cwd(), 'mobilespec'),
    output_location = path.join(mspec_dir, 'platforms', 'ios'),
    test_timeout = config.app.timeout || 10 * 60,
    TEST_OK = true;

if (argv.branch) {
    branch = argv.branch;
}

buildinfo('ios', branch, function (error, sha) {
    if (error) {
        TEST_OK = false;
    } else {
        // add medic configuration (sha, host) to destination folder
        createMedicJson(path.join(mspec_dir, 'www'), sha, config);

        ios(output_location, sha, test_timeout)
            .then(function () {
                return testcheck(sha, config.couchdb.uri);
            }, function (err) {
                TEST_OK = false;
                error_writer('ios', sha, 'iOS tests execution failed.', err);
            }).then(function (testCheckResult) {
                TEST_OK = testCheckResult;
                if (TEST_OK) {
                    console.log('ios test execution completed');
                }
            });
    }
});

process.once('exit', function () {
    if (!TEST_OK) {
        process.exit(1);
    }
});
