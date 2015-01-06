var printit = require('printit');
var Pouchdb = require('pouchdb');

// Constants
const LOGGER = printit({ prefix: 'Cozy Light' });

// 'Global' variable

var cozyLight = {
  status: 'stopped',
  init: function( program ){
    LOGGER.info('initializing..');
    cozyLight.npmHelpers.initialWd = process.cwd();
    cozyLight.configHelpers.init(program.home);
    cozyLight.configHelpers.setMainAppPort(program.port || 19104);
    process.chdir(program.home);
    cozyLight.db = new Pouchdb('cozy');
    cozyLight.pluginHelpers.loadAll(program);
    // Reload apps when file configuration is modified
    cozyLight.configHelpers.watcher.on(function configChanged () {
      LOGGER.info('Config changed...');
      if ( cozyLight.status === 'started' ) {
        LOGGER.info('...Restarting...');
        cozyLight.actions.restart(program);
      }
    });
  },
  db: null,
  routes: {},
  configHelpers: {},
  npmHelpers: {},
  pluginHelpers: {},
  applicationHelpers: {},
  mainAppHelper: {},
  actions: {}
};

cozyLight.configHelpers = require('./config-helper')();

cozyLight.npmHelpers = require('./npm-helpers')(cozyLight);
cozyLight.pluginHelpers = require('./plugin-helpers')(cozyLight);
cozyLight.applicationHelpers = require('./application-helpers')(cozyLight);
cozyLight.mainAppHelper = require('./main-app-helper')(cozyLight);
cozyLight.actions = require('./actions')(cozyLight);

module.exports = cozyLight;
