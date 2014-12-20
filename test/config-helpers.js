var fs = require('fs-extra');
var pathExtra = require('path-extra');
var assert = require('assert');
var configWatcher = require('../lib/config-watcher');

var workingDir = pathExtra.join( __dirname, '.test-working_dir');
var cozyHOME = pathExtra.join(workingDir, '.cozy-light' );

var configHelpers = require('../lib/config-helper')(cozyHOME);

before(function(){
  fs.removeSync(workingDir);
  fs.mkdirSync(workingDir);
  fs.mkdirSync(cozyHOME);
});


after(function(){
  try {
    fs.removeSync(workingDir);
  } catch(err) {
    console.log(err);
  }
});

describe('Config Helpers', function () {

  describe('createConfigFile', function () {
    it('should create an empty config file', function () {
      configHelpers.createConfigFile();
      assert(fs.existsSync(pathExtra.join(cozyHOME, 'config.json')),
        'configuration file not created');
    });
  });

  describe('modulePath', function () {
    it('return the absolute path of the given app module', function () {
      assert.equal(pathExtra.join(
          pathExtra.resolve(workingDir), '.cozy-light', 'node_modules', 'app'),
        configHelpers.modulePath('app'));
    });
  });

  describe('loadConfigFile', function () {
    it('should return config file content', function(){
      var config = configHelpers.loadConfigFile();
      assert(config.devices !== null);
    });
  });

  describe('saveConfig', function () {
    it('it should save current config to disk', function(){
      var config = configHelpers.loadConfigFile();
      config.dumbKey = true;
      configHelpers.saveConfig();
      config = configHelpers.loadConfigFile();
      assert(config.dumbKey);
    });
  });

  describe('addApp', function(){
    it('should add app manifest to the config file', function () {
      var manifest = {
        'name': 'cozy-test',
        'displayName': 'Cozy Test',
        'version': '1.1.13',
        'description': 'Test app.',
        'type': 'classic'
      };
      var app = 'cozy-labs/cozy-test';
      configHelpers.addApp(app, manifest);
      var config = configHelpers.loadConfigFile();
      assert.equal(manifest.name, config.apps[app].name);
      assert.equal(manifest.displayName, config.apps[app].displayName);
      assert.equal(manifest.version, config.apps[app].version);
      assert.equal(manifest.description, config.apps[app].description);
      assert.equal(manifest.type, config.apps[app].type);
    });
  });

  describe('exportApps', function(){
    it('return apps object from config file', function () {
      var manifest = {
        'name': 'cozy-test',
        'displayName': 'Cozy Test',
        'version': '1.1.13'
      };
      var app = 'cozy-labs/cozy-test';
      var appsConfig = configHelpers.exportApps();
      assert.equal(manifest.name, appsConfig[app].name);
      assert.equal(manifest.displayName, appsConfig[app].displayName);
      assert.equal(manifest.version, appsConfig[app].version);
    });
  });

  describe('removeApp', function () {
    it('should remove app manifest from the config file', function () {
      var app = 'cozy-labs/cozy-test';
      assert(configHelpers.removeApp(app), 'did not remove app correctly.');
      var config = configHelpers.loadConfigFile();
      assert.equal(undefined, config.apps[app]);
    });
  });

  describe('addPlugin', function () {
    it('should add plugin manifest to the config file', function () {
      var manifest = {
        'name': 'cozy-test-plugin',
        'displayName': 'Cozy Test Plugin',
        'version': '1.1.13',
        'description': 'Test plugin.'
      };
      var plugin = 'cozy-labs/cozy-test-plugin';
      var config = configHelpers.loadConfigFile();
      configHelpers.addPlugin(plugin, manifest);
      assert.equal(manifest.name, config.plugins[plugin].name);
      assert.equal(manifest.displayName, config.plugins[plugin].displayName);
      assert.equal(manifest.version, config.plugins[plugin].version);
      assert.equal(manifest.description, config.plugins[plugin].description);
      assert.equal(manifest.type, config.plugins[plugin].type);
    });
  });

  describe('exportPlugins', function () {
    it('return plugins object from config file', function () {
      var manifest = {
        'name': 'cozy-test-plugin',
        'displayName': 'Cozy Test Plugin',
        'version': '1.1.13'
      };
      var plugin = 'cozy-labs/cozy-test-plugin';
      var pluginsConfig = configHelpers.exportPlugins();
      assert.equal(manifest.name, pluginsConfig[plugin].name);
      assert.equal(manifest.displayName, pluginsConfig[plugin].displayName);
      assert.equal(manifest.version, pluginsConfig[plugin].version);
    });
  });

  describe('removePlugin', function () {
    it('should remove plugin manifest from the config file', function () {
      var plugin = 'cozy-labs/cozy-test-plugin';
      assert(configHelpers.removePlugin(plugin),
        'did not remove plugin correctly.');
      var config = configHelpers.loadConfigFile();
      assert.equal(undefined, config.plugins[plugin]);
    });
  });

  describe('copyDependency', function(){
    it('should copy dependency in the cozy light folder.', function () {
      var destPath = configHelpers.modulePath('path-extra');
      configHelpers.copyDependency('path-extra');
      assert(fs.existsSync(destPath));
    });
  });

  describe.skip('watch/unwatchConfig', function(){
    it('should add watchers to watcher list on adding', function () {
      this.watcher = function () {};
      configHelpers.watchConfig(this.watcher);
      assert.equal(this.watcher, configWatcher.watchers[0]);
    });

    it('should remove watchers to watcher list on adding', function () {
      configHelpers.unwatchConfig(this.watcher);
      assert(configWatcher.watchers.length === 0);
    });
  });

  describe('getHost', function () {
    it('returns localhost', function () {
      assert.equal(configHelpers.getHost(), 'localhost');
    });
  });

  describe('getServerUrl', function () {
    it('returns the whole server url', function () {
      assert.equal(configHelpers.getServerUrl(), 'http://localhost:19104');
    });
  });
});

