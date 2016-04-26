var path = require('path'),
    fs = require('fs'),
    https = require('https'),
    optimist = require('optimist'),
    q = require('Q'),
    mkdirp = require('mkdirp'),
    util = require('util');

var SERVER = "https://ci.apache.org";
var BUILDERS = ["cordova-windows-store8.1", "cordova-ios", "cordova-windows-phone8.1", "cordova-android-osx"];
var STEPS = ["running-tests", "gathering-logs", "getting-test-results"];
var SECONDS_IN_DAY = 86400;

function downloadLogs(outputDir, n) {
    var counter = 0;
    var builderPromises = BUILDERS.map(function(builder) {
        var buildInfoFile = path.join(outputDir, builder + ".json");
       
        //Donwload JSON data on all builds - https://ci.apache.org/json/builders/cordova-ios/builds/_all
        var buildInfoUrl = util.format("%s/json/builders/%s/builds/_all", SERVER, builder);
        return download(buildInfoUrl, buildInfoFile).then(function() {
            var buildInfo = JSON.parse(fs.readFileSync(buildInfoFile));
            var promises = [];
            for(var buildNumber in buildInfo) {
                // if build is too old - skip it.
                if (buildInfo[buildNumber].steps.length > 0 && buildInfo[buildNumber].steps[0].times.length > 0) {
                    var daysSinceBuidStart = ((Date.now() / 1000) - buildInfo[buildNumber].steps[0].times[0]) / ( SECONDS_IN_DAY);
                    if (daysSinceBuidStart > n) {
                        continue;
                    }
                }
                // find all the build steps that have logs 
                var steps = buildInfo[buildNumber].steps.filter(function (step) {
                        return STEPS.indexOf(step.name) !== -1 && step.logs && step.logs.length > 0;
                    });
                steps.forEach(function (step) {
                    var filename = util.format("%s_%s_%s_stdio.log", builder, buildNumber, step.name);
                    if(step.logs[0].length !== 2) {
                        throw new Error("Unexpected build info schema");
                    }
                    counter++;
                    var downloadPromise = download(step.logs[0][1] + "/text", path.join(outputDir, filename));
                    promises.push(downloadPromise);
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
        .usage("Usage: $0 --outpdir {path} --n {days}")
        .default("outputDir", ".")
        .default("n", 2000)
        .describe("outputDir", "Path to directory where to place logs")
        .describe("n", "Download logs for last n days")
        .argv;
        
    mkdirp.sync(argv.outputDir);
    downloadLogs(argv.outputDir, argv.n);
}
main();
