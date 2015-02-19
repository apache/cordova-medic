// /usr/bin/env node
/*jshint node: true*/

var fs     = require('fs'),
    path   = require('path'),
    argv   = require('optimist').argv,
    config = require('./config');

//get parameters, that should been written to config.xml
var entry_point = config.app.entry,
    couch_host = config.couchdb.host;

var configFile = path.join('mobilespec', 'config.xml'),
    cspFile = path.join('mobilespec', 'www', 'csp-incl.js');

if (!fs.existsSync(configFile)) {
    console.log('Config.xml file doesn\'t exists');
    process.exit(2);
} else {
    try {
        var configContent = fs.readFileSync(configFile, 'utf-8');
        // replace/add start page preference
        // check if config.xml already contains <content /> element
        console.log('Setting entry point to ' + entry_point + ' in config.xml');
        if (configContent.match(/<content\s*src=".*"\s*\/>/gi)) {
            configContent = configContent.replace(
                /<content\s*src=".*"\s*\/>/gi,
                '<content src="' + entry_point + '" />'
            );
        } else {
            // add entry point to config
            configContent = configContent.split('</widget>').join('') +
                '    <content src="' + entry_point + '" />\n</widget>';
        }

        // add whitelisting rule allow access to couch server
        console.log('Adding whitelist rule for CouchDB host: ' + couch_host);
        configContent = configContent.split('</widget>').join('') +
            '    <access origin="' + couch_host + '" />\n</widget>';

        if (argv.android) {
            console.log('Increasing url loading timeout for android:');

            var timeout = 120000,
                timeoutRegex = /<preference\s*name\s*=\s*"?loadUrlTimeoutValue"?.*?((\/>)|(>.*?<\/\s*preference>))/i,
                timeoutTag = '<preference name="loadUrlTimeoutValue" value="' + timeout + '" />',
                timeoutTagWithPlatform = '    <platform name="android">\n        <preference name="loadUrlTimeoutValue" value="120000" />\n    </platform>\n',
                platformRegex = /<platform\s*name\s*=\s*"android"\s*>/i,
                widgetRegex = /<\/s*widget\s*>/i;

            if (timeoutRegex.test(configContent)) {
                configContent = configContent.replace(timeoutRegex, timeoutTag);
                console.log('Found \'loadUrlTimeoutValue\' preference, replacing with desired value');
            } else if (platformRegex.test(configContent)) {
                var oldPlatformTag = platformRegex.exec(configContent)[0];
                configContent = configContent.replace(platformRegex, oldPlatformTag + '\n        ' + timeoutTag);
                console.log('Found platform tag, appending \'loadUrlTimeoutValue\' preference');
            } else if (widgetRegex.test(configContent)) {
                var oldWidgetTag = widgetRegex.exec(configContent)[0];
                configContent = configContent.replace(widgetRegex, timeoutTagWithPlatform + oldWidgetTag);
                console.log('Didn\'t find platform tag, adding preference with platform tag');
            } else {
                console.log('Warning: couldn\'t modify config.xml for android: no <widget> tag found!');
            }
        }

        fs.writeFileSync(configFile, configContent, 'utf-8');

        // add couchdb address to csp rules
        console.log('Adding CSP rule for CouchDB host: ' + couch_host);
        var cspContent = fs.readFileSync(cspFile, 'utf-8');
        cspContent = cspContent.replace('connect-src', 'connect-src ' + couch_host);
        fs.writeFileSync(cspFile, cspContent, 'utf-8');
    } catch (e) {
        console.log(e);
        process.exit(2);
    }
}
