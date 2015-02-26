var fs   = require('fs'),
    path = require('path');

module.exports = function createMedicJson(output, sha, cfg) {
    console.log('Writing medic.json to ' + output);
    var medic_config = '{"sha":"' + sha + '","couchdb":"' + cfg.couchdb.host + '","couchdbext":"' + cfg.couchdb.exthost + '"}';
    fs.writeFileSync(path.join(output, 'medic.json'), medic_config, 'utf-8');
};
