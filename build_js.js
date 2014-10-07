var fs = require('fs');
var exec = require('child_process').exec;
var child;

if(process.argv.slice(2)[0] == 'windows8') {
	var versionPath = '../cordova-windows/version';
}
else {
	var versionPath = '../cordova-' + process.argv.slice(2)[0] + '/version';
}

var versionContents = fs.readFileSync(versionPath, "utf-8");
child = exec('grunt --platformVersion=' + versionContents, function(err,stdout,stderr){
});