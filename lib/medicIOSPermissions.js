#!/usr/bin/env node

/* jshint node: true */
var path     = require('path');
var fs       = require('fs');
var shelljs  = require("shelljs");
var util     = require('./util');

var TCC_FOLDER_PERMISSION = 0777;

function MedicIOSPermissions(appName, tccDbPath) {
    this.appName = appName;
    this.tccDbPath = tccDbPath;
}

MedicIOSPermissions.prototype.updatePermissions = function(serviceList){
    var simulatorsFolder   = util.getSimulatorsFolder();
    var simId              = util.getSimId();
    util.medicLog('Sim Id is: ' + simId);
    var destinationTCCFile = path.join(simulatorsFolder, simId, '/data/Library/TCC/TCC.db');

    if(!util.doesFileExist(destinationTCCFile)) {
        // No TCC.db file exists by default. So, Copy the new TCC.db file
        var destinationTCCFolder = path.join(simulatorsFolder, simId, '/data/Library/TCC');
        if(!util.doesFileExist(destinationTCCFolder)){
            fs.mkdir(destinationTCCFolder, TCC_FOLDER_PERMISSION);
        }
        var command = "cp " + this.tccDbPath + " " + destinationTCCFolder;
        util.medicLog("Running Command: " + command);
        shelljs.exec(command, {silent: true, async: false});
    }

    for(var i = 0; i < serviceList.length; i++) {
        var command = util.getSqlite3InsertionCommand(destinationTCCFile, serviceList[i], this.appName);
        util.medicLog("Running Command: " + command);
        // If the service has an entry already, the insert command will fail.
        // But, such a failure is intentionally not handled here.
        shelljs.exec(command, {silent: true, async: false});
    }
}

module.exports = MedicIOSPermissions;