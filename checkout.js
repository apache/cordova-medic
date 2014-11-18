var path = require ('path');
var glob=require('glob');
var shell = require('shelljs');
var fs = require('fs');
var argv = require('optimist').argv;

var CAT='TOOLS';
var isRelease=false;
var jsonpath ='./repos.json';
var branch_release = 'release';

function getDir(reponame) {
   return path.basename(reponame,'.git');
}

if(argv.cat) CAT = argv.cat;
if(argv.release) isRelease = true;
if(argv.path) jsonpath = argv.path;
if(argv.releasebranch) branch_release = argv.releasebranch;

var repos = JSON.parse(fs.readFileSync(jsonpath, 'utf8'));

repos.repos.forEach( function(repo) {
    if(repo.category == CAT.toUpperCase()) {
        var branch = isRelease ? repo.release : repo.current;
        branch = branch == "RELEASE" ? branch_release : branch;
        var dir = getDir(repo.repo);
        var remotename = path.basename(path.dirname(repo.repo));

        if(fs.existsSync(dir + '/.git')) {
            console.log('Repo ' + repo.repo + ' has already cloned!');
            process.exit(1);
        } else {
            shell.exec('git clone ' + repo.repo + ' --branch=' + branch + ' --depth ' + '1');
        }
    }
});


