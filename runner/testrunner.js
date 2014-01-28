var http = require('http');
var path = require ('path');
var shell = require('shelljs');
var fs = require('fs');
var cp = require('child_process');
var argv = require('optimist').argv;
var url=require('url');

var logport =0;
var logurl='http://127.0.0.1';
var testprocess;

var testpath = process.cwd();
if(argv.path) testpath=argv.path;

var cmdpath = "./runtest.sh";
if(argv.cmd) cmdpath=argv.cmd;

if(argv.port) logport=argv.port;

function writejson(port,cfgpath){
  var cfgobj = {logurl:"http://127.0.0.1:"+port};
  if(!fs.existsSync(cfgpath)) fs.mkdirSync(cfgpath);
  fs.writeFileSync(path.join(cfgpath,'medic.json'), JSON.stringify(cfgobj));
}

function startTest(){
  console.log("starting test "+cmdpath);
  testprocess=cp.execFile(cmdpath,[testpath]);
  if(testprocess){
    console.log("started test: "+testprocess.pid);
  } else {
    console.log("failed to start test in "+testpath);
  }
}

function endTest(resultcode){
  console.log("ending test - process ",testprocess.pid);
  server.close();
  if(testprocess){
    process.kill(testprocess.pid);
    console.log("killed test.");
  } else {
    console.log("cant kill test.");
  }
  process.exit(resultcode);
}

var server = http.createServer(function (req, res) {
  if(req.method==="POST") {
    var route=url.parse(req.url).pathname;
    var body = '';
    req.setEncoding('utf8');
    req.on('data',function(chunk){body += chunk;});
    req.on('end',function(){
      console.log(body);
      if(route == '/result'){
        var resultcode=0;
        try{
          var r = JSON.parse(body);
          if(r.mobilespec.failures >0) resultcode=1;
        } catch(err) {
          resultcode=2;
        }
        endTest(resultcode);
      }
    });    
    res.writeHead(200, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin':'*'});
    res.end('Got that\n');
  }
});
server.listen(logport, '127.0.0.1',511,function(){
  logport = server.address().port;
  console.log('Server running at '+logurl+':'+logport);
  writejson(logport,testpath);
  startTest();
});



