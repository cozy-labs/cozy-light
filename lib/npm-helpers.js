
var fs = require('fs');
var npm = require('npm');
var pathExtra = require('path-extra');
var request = require('request-json-light');

module.exports = function(cozyLight){

  var nodeHelpers = cozyLight.nodeHelpers;
  var logger = cozyLight.logger;
  var configHelpers = cozyLight.configHelpers;

  var npmHelpers = {

    /**
     * initial working directory of the spawner
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
     * View package information from Npm.
     *
     * @param {String} app App to fetch from NPM.
     * @param {Function} callback Callback to run once work is done.
     */
    view: function (app, callback) {
      var options = {
        dir: configHelpers.getModulesPath(),
        prefix: '',
        silent:true
      };
      npm.load(options, function () {
        npm.commands.view([app], true, callback);
      });

    },

    /**
     * View package information from github repo.
     *
     * @param {String} repo Repo to fetch from github.
     * @param {Function} callback Callback to run once work is done.
     */
    viewGitHub: function (repo, callback) {
      var client = request.newClient('https://raw.githubusercontent.com/');
      var manifestUrl = repo + '/master/package.json';

      client.get(manifestUrl, function (err, res, manifest) {
        if (err) {
          nodeHelpers.invoke(callback, err);
        } else if (res.statusCode !== 200) {
          nodeHelpers.invoke(callback, err);
        } else {
          nodeHelpers.invoke(callback, err, manifest);
        }
      });

    },

    /**
     * View package information from file system.
     *
     * @param {String} path Path to the module.
     * @param {Function} callback Callback to run once work is done.
     */
    viewFileSystem: function (path, callback) {
      var appPath = pathExtra.resolve(npmHelpers.initialWd, path);

      var manifestPath = pathExtra.join(appPath, 'package.json');
      if (fs.existsSync(appPath) && fs.existsSync(manifestPath) ) {
        fs.readFile(manifestPath, function checkError (err, manifest) {
          if (err) {
            logger.error(err);
            nodeHelpers.invoke(callback, err);
          } else {
            nodeHelpers.invoke(callback, err, JSON.parse(manifest));
          }
        });
      } else {
        nodeHelpers.invoke(callback, true);
      }

    },

    /**
     * Fetch application or plugin manifest from an url or a path
     *
     * @param {String} app App or Plugin name to fetch from url or path.
     * @param {Function} callback Termination.
     */
    fetchManifest: function (app, callback) {

      npmHelpers.viewFileSystem(app, function(fsErr, fsManifest){
        if (!fsErr) {
          nodeHelpers.invoke(callback, fsErr, fsManifest, 'file');
        } else {
          npmHelpers.viewGitHub(app, function(gitErr, gitManifest){
            if (!gitErr) {
              nodeHelpers.invoke(callback, gitErr, gitManifest, 'url');
            } else {
              npmHelpers.view(app, function(npmErr, npmManifest){
                if (!npmErr) {
                  npmManifest = npmManifest[Object.keys(npmManifest)[0]];
                  nodeHelpers.invoke(callback, npmErr, npmManifest, 'url');
                } else {
                  nodeHelpers.invoke(callback, npmErr);
                }
              });
            }
          });
        }
      });

    }
  };

  return npmHelpers;
};
