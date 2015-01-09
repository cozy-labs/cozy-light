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
  /**
   * Manage properly exit of the process when SIGINT signal is triggered.
   * It asks to every plugin to end properly.
   */
  stop: function( callback ){
    cozyLight.actions.stop(function endProcess (err) {
      if (err) {
        cozyLight.logger.error('Cozy Light was not properly terminated.');
      } else {
        cozyLight.logger.info('Cozy Light was properly terminated.');
      }

      var done_callback = function(){
          cozyLight.configHelpers.watcher.release();
          cozyLight.mutexer.remove();
          cozyLight.nodeHelpers.invoke(callback);
      };

      if (cozyLight.db) {
          done_callback = function(){
              try {
                  /*eslint-disable */
                  if(!cozyLight.db._closed) {
                      /*eslint-enable */
                      cozyLight.db.close(function(){
                          cozyLight.configHelpers.watcher.release();
                          cozyLight.mutexer.remove();
                          cozyLight.nodeHelpers.invoke(callback);
                      });
                  }
              } catch (err) {
                  cozyLight.logger.error(err);
              }
          };
      }
        cozyLight.nodeHelpers.invoke(done_callback);
    });
  },
  /**
   * Manage properly exit of the process when SIGINT signal is triggered.
   * It asks to every plugin to end properly.
   */
  exit: function( err ){
    if (err) {
      cozyLight.logger.warn('An exception is uncaught');
      cozyLight.logger.raw(err);
      cozyLight.logger.raw(err.stack);
    }
    /*eslint-disable */
    var handlesC = process._getActiveHandles().length;
    var requestsC = process._getActiveRequests().length;
    /*eslint-enable */
    if ( /*process.env.DEBUG !== undefined &&*/ (handlesC + requestsC > 0)){
      cozyLight.logger.info('Has remaining open handles...');
      cozyLight.logger.info('_getActiveHandles ' + handlesC);
      cozyLight.logger.info('_getActiveRequests ' + requestsC);
      cozyLight.logger.info('Killing process.');
      /*eslint-disable */
      process.exit(err ? 1 : 0);
      /*eslint-enable */
    }
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
