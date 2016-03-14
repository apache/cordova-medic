var execSync = require('child_process').execSync;
var path = require('path');
var fs = require('fs');
var util = require('util');

// ToDO: get appName dynamically => createmobilespec
var appName = 'org.apache.mobilespec';
var simulatorsFolder = '/Users/omefire/Library/Developer/CoreSimulator/Devices';

function getDirectories(srcpath) {
  return fs.readdirSync(srcpath).filter(function(file) {
    return fs.statSync(path.join(srcpath, file)).isDirectory();
  });
}

function doesFileExist(filePath) {
    var fileExists = false;
    try {
        stats = fs.statSync(filePath);
        fileExists = true;
    } catch (e) {
        fileExists = false;
    }   
    return fileExists;
}

main = function() {    
    getDirectories(simulatorsFolder).forEach(function(simFolder) {        
        // ToDO: Fix this path before deployment: '..' => 'lib'
        var srcTCCFile = path.join(__dirname, 'TCC.db');
        var destinationTCCFile = path.join(simulatorsFolder, simFolder, '/data/Library/TCC/TCC.db');
            
        // If the destination TCC file already exists, delete it first!
        if(doesFileExist(destinationTCCFile)) {
            fs.unlinkSync(destinationTCCFile);
        }

        // If the destination TCC file doesn't exist yet, just copy from src to dest
        fs.createReadStream(srcTCCFile).pipe(fs.createWriteStream(destinationTCCFile));
        
        // Update permissions
        fs.chmodSync(destinationTCCFile, 0777);
    });
};

main();