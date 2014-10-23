var http = require('http');
var url = require('url');

var checkTestResults = function(sha, dbHost) {
    console.log('Starting results verification for ' + sha);

    var options = {
        host: url.parse(dbHost).hostname,
        port: url.parse(dbHost).port,
        path: '/mobilespec_results/_all_docs?start_key="' + sha + '"&limit=1'
    };

    var resultsDoc = "";

    // get current document id by sha
    var req =  http.get(options, function(result) {
        result.on("data", function(chunk) {
            resultsDoc += chunk.toString();
        });

        result.on('end', function () {
            var resultId = JSON.parse(resultsDoc).rows[0].id;

            var requestOptions = {
                host: url.parse(dbHost).hostname,
                port: url.parse(dbHost).port,
                path: '/mobilespec_results/' + resultId
            };

            var resultsJSON = "";
            var failure;

            // get failures by document id
            var resultsRequest = http.get(requestOptions, function(res) {
                res.on("data", function(chunk) {
                    resultsJSON += chunk;
                });

                res.on('end', function() {
                    failure = JSON.parse(resultsJSON);
                    if(typeof failure.mobilespec.failures == "undefined") {
                        console.log("No failures were detected");
                        return 0;
                    } else {
                        console.log('Test failures were detected. Open ' +
                        dbHost + '/_utils/document.html?mobilespec_results/' +
                        resultId + ' for details');
                        return -1;
                    }
                });
            }).on('error', function(e) {
                console.log("Got error: " + e.message);
            });
        });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
}

module.exports.checkTestResults = checkTestResults;