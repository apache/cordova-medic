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

function hasRemote (remote) {
    get_remote = shell.exec('git remote -v');
    if (get_remote.code > 0) {
        return false;
    }
    var remotes = get_remote.output.split('\n');
    for (var i in remotes){
        if (remotes[i].indexOf(remote) > -1){
            return true;
        }
    }
    return false;
}

if(argv.cat) CAT=argv.cat;
if(argv.release) isRelease=true;
if(argv.path) jsonpath=argv.path;
if(argv.releasebranch) branch_release= argv.releasebranch;

var repos = JSON.parse(fs.readFileSync(jsonpath, 'utf8'));

repos.repos.forEach( function(repo) {
    // console.log('checking '+JSON.stringify(repo));
    if(repo.category == CAT) {
        var branch = isRelease ? repo.release : repo.current;
        branch = branch =="RELEASE" ? branch_release : branch;
        var dir = getDir(repo.repo);
        var remotename = path.basename(path.dirname(repo.repo));
        if(fs.existsSync(dir) && fs.statSync(dir).isDirectory() ) {
            shell.pushd(dir);
            if(fs.existsSync('.git')) {
                // Check if remote from repos.json already added to local repo
                if (!hasRemote(repo.repo)){
                    // If not, then add it, and checkout branch from there
                    console.log('Adding remote: ' + remotename + ' ' + repo.repo);
                    var remote_add = shell.exec('git remote add -f ' + remotename + ' ' + repo.repo + ' -t ' + branch);
                }
                console.log('Checking branch ' + branch);
                var checkout = shell.exec('git checkout ' + branch);
            }
            shell.popd();
        }
    }
});


