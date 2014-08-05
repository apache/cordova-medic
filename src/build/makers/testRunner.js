var shell        = require('shelljs'),
    couch        = require('../../couchdb/interface'),
    q            = require('q');

function query_for_sha(sha, callback) {
    var view = 'sha?key="' + sha + '"';
    // get build errors from couch for each repo
    couch.mobilespec_results.query_view('results', view, function(error, result) {
        if (error) {
            console.error('query failed for mobilespec_results', error);
            callback(true, error);
            return;
        }
        callback(false, result);
    });
}

function isTestsCompleted(sha, callback) {
    query_for_sha(sha, function(isFailed, res) {
        // return True if there is no error and there are test results in db for specified sha
        callback(!isFailed && res.rows.length > 0);
    });
}

function waitTestsCompleted(sha, timeoutMs) {
   var defer = q.defer();
   var startTime = Date.now(),
       timeoutTime = startTime + timeoutMs,
       checkInterval = 10 * 1000; // 10 secs

    var testFinishedFn = setInterval(function(){

        isTestsCompleted(sha, function(isSuccess) {
            // if tests are finished or timeout
            if (isSuccess || Date.now() > timeoutTime) {
                clearInterval(testFinishedFn);
                isSuccess ? defer.resolve() : defer.reject('timed out');
            }
        });
    }, checkInterval);
    return defer.promise;
}

module.exports = {
    waitTestsCompleted:waitTestsCompleted
}
