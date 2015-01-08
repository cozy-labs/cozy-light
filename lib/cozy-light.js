var printit = require('printit');
var Pouchdb = require('pouchdb');

// 'Global' variable

var cozyLight = {
  status: 'stopped',
  init: function( program ){
    cozyLight.logger.info('initializing..');
    cozyLight.npmHelpers.initialWd = process.cwd();
    cozyLight.configHelpers.init(program.home);
    cozyLight.configHelpers.setMainAppPort(program.port || 19104);
    process.chdir( cozyLight.configHelpers.getHomePath() );
    cozyLight.db = new Pouchdb('cozy');
    cozyLight.pluginHelpers.loadAll(program);
    // Reload apps when file configuration is modified
    cozyLight.configHelpers.watcher.on(function configChanged () {
      cozyLight.logger.info('Config changed...');
      if ( cozyLight.status === 'started' ) {
        cozyLight.logger.info('...Restarting...');
        cozyLight.actions.restart(program);
      }
    });
  },
  logger: printit({ prefix: 'Cozy Light' }),
  db: null,
  routes: {},
  configHelpers: {},
  nodeHelpers: {},
  mutexer: {},
  npmHelpers: {},
  pluginHelpers: {},
  applicationHelpers: {},
  mainAppHelper: {},
  actions: {}
};

cozyLight.configHelpers = require('./config-helper')();

cozyLight.nodeHelpers = require('./node-helpers');
cozyLight.npmHelpers = require('./npm-helpers')(cozyLight);
cozyLight.mutexer = require('./mutexer')(cozyLight);
cozyLight.pluginHelpers = require('./plugin-helpers')(cozyLight);
cozyLight.applicationHelpers = require('./application-helpers')(cozyLight);
cozyLight.mainAppHelper = require('./main-app-helper')(cozyLight);
cozyLight.actions = require('./actions')(cozyLight);

module.exports = cozyLight;
