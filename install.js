var os = require('os'),
    exec = require('child_process').exec;

console.log('Installing platform specific dependencies...');
console.log('Current platform is ' + os.platform());

var installDependency = function(name) {
    var cmd = 'npm install ' + name;
    console.log (cmd);
    exec(cmd, function (error, stdout, stderr) {
        if (error) {
          console.log('error: ' + error);
          if (stderr) console.log('stderr: ' + stderr);
          throw new Error('Dependency installation failed');
        }
        console.log('Successfully installed ' + name);
  });
};

// the following dependencies must be installed only on non-Windows paltforms
if (os.platform() !== "win32") {
  installDependency('ios-deploy');
  //installDependency('git://github.com/filmaj/fruitstrap.git');
}