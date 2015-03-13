var fs = require('fs');
var npm = require('npm');
var pathExtra = require('path-extra');
var request = require('request-json-light');

var logger = require('./logger');
var nodeHelpers = require('./node');
var configHelpers = require('../config');


module.exports = npmHelpers = {

  /**
   * Directory where node modules will be installed.
   */
  initialWd: '',

  /**
   * Fetch given app source and dependencies from NPM registry.
   *
   * Config file is ~/.cozy-light/.config
   *
   * @param {String} app App to fetch from NPM.
   * @param {Function} callback Callback to run once work is done.
   */
  install: function (app, callback) {
    var options = {
      dir: configHelpers.getModulesPath(),
      prefix: ''
    };
    npm.load(options, function () {
      npm.commands.install([app], callback);
    });
  },

  /**
   * Link given app source and dependencies from local file system.
   *
   * @param {String} app Path to the module to link.
   * @param {Function} callback Callback to run once work is done.
   */
  link: function (app, callback) {
    var options = {
      local: true,
      dir: configHelpers.getModulesPath(),
      prefix: ''
    };
    npm.load(options, function () {
      app = pathExtra.resolve(npmHelpers.initialWd, app);
      npm.commands.link([app], callback);
    });
  },

  /**
   * Remove application source and dependencies using NPM lib.
   *
   * @param {String} app App to fetch from NPM.
   * @param {Function} callback Callback to run once work is done.
   */
  uninstall: function (app, callback) {
    var options = {
      dir: configHelpers.getModulesPath(),
      prefix: ''
    };
    npm.load(options, function () {
      npm.commands.uninstall([app], callback);
    });
  },

  /**
   * Fetch application or plugin manifest from an url or a path
   *
   * @param {String} app App or Plugin name to fetch from url or path.
   * @param {Function} callback Termination.
   */
  fetchManifest: function (app, callback) {
    var appPath = pathExtra.resolve(npmHelpers.initialWd, app);
    var manifestPath = pathExtra.join(appPath, 'package.json');

    if (fs.existsSync(appPath) && fs.existsSync(manifestPath)) {
      fs.readFile(manifestPath, function checkError (err, manifest) {
        if (err) {
          logger.error(err);
          nodeHelpers.invoke(callback, err);
        } else {
          nodeHelpers.invoke(callback, err, JSON.parse(manifest), 'file');
        }
      });
    } else {
      var client = request.newClient('https://raw.githubusercontent.com/');
      /* Checking if a branch of the github repo is specified
       * within the application path parameter (separated with a @).
       */
      if (app.indexOf('@') > 1) {
        // if a branch is specified, we build the url with it.
        var manifestUrl = app.split('@')[0] + '/' + app.split('@')[1] +  '/package.json';
      } else {
        // if no branch is specified, we build the url with master branch.
        var manifestUrl = app + '/master/package.json';
      }
      console.log(manifestUrl);

      client.get(manifestUrl, function (err, res, manifest) {
        if (err) {
          logger.error(err);
          nodeHelpers.invoke(callback, err);
        } else if (res.statusCode !== 200) {
          logger.error(err);
          nodeHelpers.invoke(callback, err);
        } else {
          nodeHelpers.invoke(callback, err, manifest, 'url');
        }
      });
    }
  }
};
