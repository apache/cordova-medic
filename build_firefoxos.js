var path             = require ('path'),
    buildinfo        = require('./buildinfo'),
    config           = require('./config'),
    firefoxos        = require('./src/build/makers/firefoxos'),
    argv             = require('optimist').argv,
    testcheck        = require('./testchecker'),
	createMedicJson  = require('./src/utils/createMedicJson');


// this assumes that you start it in the sandbox
var test_dir   = process.cwd(),
    branch     = 'master',
    mspec_dir  = path.join(test_dir,'mobilespec'),
    TEST_OK    = true;

if(argv.branch) { 
	branch=argv.branch;
}

var output_location = path.join(mspec_dir,'platforms','firefoxos');

buildinfo('FirefoxOS', branch, function (error, sha ) {
    if(error) {
        TEST_OK=false;
    } else {
    	// add medic configuration (sha, host) to destination folder
        createMedicJson(path.join(mspec_dir, 'www'), sha, config);    	

        firefoxos(output_location, sha,'', config.app.entry, config.couchdb, function(err){
            if(err) {
                console.log('FirefoxOS test prepare failed');
                TEST_OK=false;
            } else {
                console.log('FirefoxOS tests complete');
                TEST_OK = true;
            }
       });
    }
});

process.once('exit', function () {
    if(!TEST_OK) {
    	process.exit(1);
    }
});

