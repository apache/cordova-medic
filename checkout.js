var path = require ('path');
var glob=require('glob');
var shell = require('shelljs');
var fs = require('fs');
var argv = require('optimist').argv;

var CAT='TOOLS';
var isRelease=false;
var jsonpath ='./repos.json';

function getDir(reponame) {
   return path.basename(reponame,'.git');
}

if(argv.cat) CAT=argv.cat;
if(argv.release) isRelease=true;
if(argv.path) jsonpath=argv.path;

var repos = JSON.parse(fs.readFileSync(jsonpath, 'utf8'));

repos.repos.forEach( function(repo) {
//    console.log('checking '+JSON.stringify(repo));
    if(repo.category == CAT) {
        var branch = repo.current;
        if(isRelease) branch = repo.release;
        var dir = getDir(repo.repo);
        if(fs.statSync(dir).isDirectory() ) {
            shell.pushd(dir);
            if(fs.existsSync('.git')) {
    console.log('checking '+JSON.stringify(repo));
                var cmdout = shell.exec('git checkout '+branch);
            }
            shell.popd();
        }
    }
});


