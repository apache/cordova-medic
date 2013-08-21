var path = require ('path');
var shell = require('shelljs');
var fs = require('fs');
var couch = require('./src/couchdb/interface');

module.exports=function saveBuildInfo(platform,branch,callback) {
    var TEST_DIR=process.cwd();
    var buildinfo={};
    var dirs = fs.readdirSync(TEST_DIR);
    dirs.map(function(file) {
        if(fs.statSync(file).isDirectory() ) {
            shell.pushd(file);
            if(fs.existsSync('.git')) {
                var cmdout = shell.exec('git rev-parse HEAD');
                if(cmdout.code == 0) {
                    buildinfo[file]=cmdout.output;
                }
            }
            shell.popd();
        }
    });
    
    var testdate = new Date();
    var doc= {
         components:buildinfo,
         testdate:testdate,
         platform:platform,
         branch:branch,
         timestamp:Math.round(Math.floor(testdate.getTime() / 1000))
    };

    // fire off to couch
    var doc_id_array = [doc.platform,branch, doc.timestamp];
    doc_id_array = doc_id_array.map(encodeURIComponent);
    var doc_id = doc_id_array.join('__');
    couch.test_details.clobber(doc_id, doc, function(resp, body) {
        if (resp.error) {
            console.error('[COUCH ERROR] Saving doc with id ' + doc_id);
            callback(true, "");
        } else {
            var testtag=doc_id;
            callback(false,testtag);
        }
    });
}

