var path = require('path'),
    fs = require('fs'),
    https = require('https'),
    optimist = require('optimist');
    q = require('Q'),
    mkdirp = require('mkdirp')
    util = require('util');

var SERVER = "https://ci.apache.org";
var BUILDERS = ["cordova-windows-store8.1", "cordova-ios", "cordova-windows-phone8.1", "cordova-android-osx","cordova-android-win"];
//var BUILDERS = ["cordova-windows-store8.1"];
var STEPS = ["running-tests", "gathering-logs", "getting-test-results"];

function downloadLogs(outputDir) {
    var counter = 0;
    var builderPromises = BUILDERS.map(function(builder) {
        //https://ci.apache.org/json/builders/cordova-ios/builds/_all
        var buildInfoFile = path.join(outputDir, builder + ".json");
        var buildInfoUrl = util.format("%s/json/builders/%s/builds/_all", SERVER, builder);
        return download(buildInfoUrl, buildInfoFile).then(function() {
            var buildInfo = JSON.parse(fs.readFileSync(buildInfoFile));
            var promises = [];
            for(var buildNumber in buildInfo) {
                var steps = buildInfo[buildNumber].steps.filter(
                    function(step) {
                        return STEPS.indexOf(step.name) !== -1 && step.logs && step.logs.length > 0;
                    });
                steps.forEach(function(step) {
                    var filename = util.format("%s_%s_%s_stdio.log", builder, buildNumber, step.name);
                    if(step.logs[0].length !== 2) {
                        throw "Unexpected build info schema";
                    }
                    counter++;
                    promises.push(download(step.logs[0][1] + "/text", path.join(outputDir, filename)));
                });
            }
            return q.all(promises);
        });
    });
    
    q.all(builderPromises).done(function() {
        console.log("Downloaded " + counter + " logs to " + outputDir);
    }, function(error) {
        console.log("Error: " + error);
    });
}

function download(url, filename){
    var defer = q.defer();
    https.get(url, function(res) {
        res.setEncoding('utf-8');
        if (res.statusCode == 200) {
            var file = fs.createWriteStream(filename);
            res.pipe(file);
            file.on('finish', function() {
               console.log(url + " -> " + filename);
               file.end();
               defer.resolve(); 
            });
        } else {
            defer.reject(url + " Status code: " + res.statusCode);
        }
    }).on('error', function(error) {
        defer.reject(url + " Error: " + error);
    });
    return defer.promise;   
}

// main
function main() {
    // get args
    var argv = optimist
        .usage("Usage: $0 --outpdir {path}")
        .default("outputDir", ".")
        .argv;
        
    mkdirp.sync(argv.outputDir);
    downloadLogs(argv.outputDir);
}
main();
