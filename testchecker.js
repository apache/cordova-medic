var http = require('http'),
    url = require('url'),
    q = require('q');

module.exports = function (sha, dbHost) {

    function getDocumentIdBySha() {
        var options = {
            host : url.parse(dbHost).hostname,
            port : url.parse(dbHost).port,
            path : '/mobilespec_results/_all_docs?start_key="' + sha + '"&limit=1'
        },
            resultsDoc = '',
            d = q.defer();

        http.get(options, function (result) {
            result.on("data", function (chunk) {
                resultsDoc += chunk.toString();
            });
            result.on('end', function () {
                d.resolve(JSON.parse(resultsDoc).rows[0].id);
            });
        }).on('error', function (e) {
            console.log("Got error: " + e.message);
            d.reject(e);
        });

        return d.promise;
    };

    function getTestResult(resultId) {
        var options = {
            host : url.parse(dbHost).hostname,
            port : url.parse(dbHost).port,
            path : '/mobilespec_results/' + resultId
        },
            d = q.defer(),
            resultsJSON = "",
            failure;

        http.get(options, function (res) {
            res.on("data", function (chunk) {
                resultsJSON += chunk;
            });
            res.on('end', function () {
                d.resolve(JSON.parse(resultsJSON));
            });
        }).on('error', function (e) {
            console.log("Got error: " + e.message);
            d.reject(e)
        });

        return d.promise;
    };

    function checkFailure(testResult) {
        if (typeof testResult.mobilespec.failures == "undefined" || testResult.mobilespec.failures === 0) {
            console.log("No failures were detected");
            return true;
        } else {
            console.log("Total failures: " + testResult.mobilespec.failures);
            console.log('Test failures were detected. Open ' + dbHost + '/_utils/document.html?mobilespec_results/' + testResult._id + ' for details');
            console.log("Failing tests:");
            testResult.mobilespec.results.forEach(function (result) {
                if (result.status === "failed") {
                    console.log(result.fullName);
                }
            });

            return false;
        }
    };

    console.log('Starting results verification for ' + sha);

    return getDocumentIdBySha().then(getTestResult).then(checkFailure);
};
