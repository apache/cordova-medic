#!/usr/bin/env node

// node dependencies
var fs = require('fs');

// external dependencies
var shell = require('shelljs');

// parse args
var argv = require('optimist')
    .usage('Usage: $0 --config {path} --exclude {name[,name[,...]]}')
    .demand('config')
    .argv;

function cloneProject(projectName, projectsConfig) {

    var project  = projectsConfig[projectName];
    var codebase = project.codebases[project.codebase];
    var command  = 'git clone ' + codebase.repo + ' --branch=' + codebase.branch + ' --depth 1'

    shell.exec(command, {silent: false}, function (returnCode, output) {
        if (returnCode !== 0) {
            throw 'Command \'' + command + '\' failed with code ' + returnCode;
        }
    });
}

function main () {

    // get args
    var configFile    = argv.config;
    var excludedNames = [];

    if (argv.exclude) {
        excludedNames = argv.exclude.split(',');
    }

    // shell config
    shell.config.fatal  = true;
    shell.config.silent = false;

    // read in config
    var projectsConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));

    // clone all projects in the config
    for (projectName in projectsConfig) {
        if (excludedNames.indexOf(projectName) === (-1)) {
            cloneProject(projectName, projectsConfig);
        }
    }
}

main();
