var shell        = require('shelljs'),
    path         = require('path'),
    error_writer = require('./error_writer'),
    q            = require('q'),
    testRunner   = require('./testRunner');

module.exports = function (output, sha, test_timeout) {
    function log(msg) {
        console.log('[IOS] ' + msg + ' (sha: ' + sha + ')');
    }
    // compile
    log('Compiling.');
    log(output);

    var mobileSpecDir = path.join(output, '..', '..'),
        buildCommand = 'cd ' + mobileSpecDir + ' && ./cordova build';
    log(mobileSpecDir);
    log(buildCommand);

    var build = shell.exec(buildCommand, {silent: true});
    if (build.code > 0) {
        error_writer('ios', sha, 'Build error.', build.output);
        return q.reject('Error while building, exit code: ' + build.code);
    }

    var runCommand = 'cd ' + mobileSpecDir + ' && ./cordova run';
    log(runCommand);
    var run = shell.exec(runCommand, {silent: true});
    if (run.code > 0) {
        error_writer('ios', sha, 'Error while deploying.', run.output);
        return q.reject('Error while deploying, exit code: ' + run.code);
    }

    log('Waiting for tests to complete...');

    return testRunner.waitTestsCompleted(sha, 1000 * test_timeout);
};
