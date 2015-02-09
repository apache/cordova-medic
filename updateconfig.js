// /usr/bin/env node
/*jshint node: true*/

var fs   = require('fs'),
    path = require('path'),
    config = require('./config');

//get parameters, that should been written to config.xml
var entry_point = config.app.entry,
    couch_host = config.couchdb.host;

// WORKAROUND:
//            on iOS, the entry point is unique; hard-code it explicitly for now
if (os.platform == 'darwin') {
    entry_point = 'cdvtests/index.html';
}

var configFile = path.join('mobilespec', 'config.xml');
if (!fs.existsSync(configFile)){
    console.log('Config.xml file doesn\'t exists');
    process.exit(2);
} else {
    try {
        var configContent = fs.readFileSync(configFile, 'utf-8');
        // replace/add start page preference
        // check if config.xml already contains <content /> element
        console.log('Setting entry point to ' + entry_point + ' in config.xml');
        if (configContent.match(/<content\s*src=".*"\s*\/>/gi)){
            configContent = configContent.replace(
                /<content\s*src=".*"\s*\/>/gi,
                '<content src="' + entry_point + '" />');
        } else {
            // add entry point to config
            configContent = configContent.split('</widget>').join('') +
                '    <content src="' + entry_point + '"/>\n</widget>';
        }

        // add whitelisting rule allow access to couch server
        console.log('Adding whitelist rule for CouchDB host: ' + couch_host);
        configContent = configContent.split('</widget>').join('') +
            '    <access origin="' + couch_host + '" />\n</widget>';

        fs.writeFileSync(configFile, configContent, 'utf-8');
    } catch (e) {
        console.log(e);
        process.exit(2);
    }
}
