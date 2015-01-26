var pathExtra = require('path-extra');
var printit = require('printit');
var logger = printit({prefix: 'Cozy Light'});

var platformStatus = 'stopped';

var cozyLight = {

  setStarted: function () {
    platformStatus = 'started';
  },

  setStopped: function () {
    platformStatus = 'stopped';
  },

  getStatus: function () {
    return platformStatus;
  },

  init: function (program) {
    if (program === undefined) { program = {}; }
    var defaultHome = pathExtra.join(pathExtra.homedir(), '.cozy-light');
    var home = program.home || defaultHome;

    cozyLight.logger.debug('Initializing Cozy Light...');
    cozyLight.npmHelpers.initialWd = process.cwd();
    cozyLight.configHelpers.init(home);

    process.chdir(cozyLight.configHelpers.getHomePath());

    cozyLight.logger.info('Home is ' + cozyLight.configHelpers.getHomePath());

    cozyLight.pluginHelpers.loadAll(program);

    // Reload apps when file configuration is modified
    cozyLight.configHelpers.watcher.on(function () {
      cozyLight.logger.info('Configuration changed...');
      if (cozyLight.getStatus() === 'started') {
        cozyLight.logger.info('Cozy Light is restarting...');
        cozyLight.actions.restart(program);
      }
    });
  },

  /**
   * Manage properly exit of the process when SIGINT signal is triggered.
   * It asks to every plugin to end properly.
   */
  stop: function (callback) {
    cozyLight.actions.stop(function endProcess (err) {
      if (err) {
        cozyLight.logger.error('Cozy Light was not properly terminated.');
      } else {
        cozyLight.logger.debug('Cozy Light was properly terminated.');
      }

      var doneCallback = function(){
        if (cozyLight.configHelpers.watcher)
          cozyLight.configHelpers.watcher.release();
        cozyLight.nodeHelpers.invoke(callback);
      };

      return cozyLight.nodeHelpers.invoke(doneCallback);
    });
  },

  /**
   * Manage properly exit of the process when SIGINT signal is triggered.
   * It asks to every plugin to end properly.
   */
  exit: function (err) {
    if (!cozyLight.nodeHelpers.hasFreedResources()) {
      cozyLight.logger.info('Has remaining open handles...');
      cozyLight.logger.info('Killing process.');
      /*eslint-disable */
      process.exit(err ? 1 : 0);
      /*eslint-enable */
    }
  },

  logger: logger,
  routes: require('./routes'),
  configHelpers: require('./config'),
  nodeHelpers: require('./helpers/node'),
  npmHelpers: require('./helpers/npm'),
  pluginHelpers: require('./plugins'),
  applicationHelpers: require('./applications'),
  mainAppHelper: require('./main'),
  actions: require('./actions')
};

module.exports = cozyLight;
