var fs = require('fs-extra');
var pathExtra = require('path-extra');
var assert = require('assert');
require('should');

var workingDir = pathExtra.join(__dirname, '.test-working_dir');
var cozyHOME = pathExtra.join(workingDir, '.cozy-light');

var configHelpers = require('../lib/config');

before(function(){
  try {
    fs.removeSync(workingDir);
  } catch(err) {
    console.log(err);
  }
  fs.mkdirSync(workingDir);
  fs.mkdirSync(cozyHOME);
  configHelpers.setHomePath(cozyHOME);
});


after(function(){
  try {
    fs.removeSync(workingDir);
  } catch(err) {
    console.log(err);
  }
});

describe('Config Helpers', function () {

  describe('getConfigPath', function () {
    it('should create config file in cozy home path', function () {
      var p = pathExtra.join(cozyHOME, 'config.json');
      configHelpers.getConfigPath().should.eql(p,
        'configuration file not created');
    });
  });

  describe('createConfigFile', function () {
    it('should create an empty config file', function () {
      configHelpers.createConfigFile();
      fs.existsSync(pathExtra.join(cozyHOME, 'config.json') ).should.eql(true,
        'configuration file not created');
    });
  });

  describe('modulePath', function () {
    it('return the absolute path of the given app module', function () {
      var p = pathExtra.join(pathExtra.resolve(workingDir),
        '.cozy-light', 'node_modules', 'app');
      configHelpers.modulePath('app').should.eql(p,
        'wrong module path');
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
      (true).should.eql(config.dumbKey,
        'Config was not properly updated.');
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
      manifest.name.should.eql(config.apps[app].name);
      manifest.displayName.should.eql(config.apps[app].displayName);
      manifest.version.should.eql(config.apps[app].version);
      manifest.description.should.eql(config.apps[app].description);
      manifest.type.should.eql(config.apps[app].type);
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
      manifest.name.should.eql(appsConfig[app].name);
      manifest.displayName.should.eql(appsConfig[app].displayName);
      manifest.version.should.eql(appsConfig[app].version);
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
      manifest.name.should.eql(config.plugins[plugin].name);
      manifest.displayName.should.eql(config.plugins[plugin].displayName);
      manifest.version.should.eql(config.plugins[plugin].version);
      manifest.description.should.eql(config.plugins[plugin].description);
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
      manifest.name.should.eql(pluginsConfig[plugin].name);
      manifest.displayName.should.eql(pluginsConfig[plugin].displayName);
      manifest.version.should.eql(pluginsConfig[plugin].version);
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
      fs.existsSync(destPath).should.eql(true,
        'did not copy the dependency.');
    });
  });

  describe('getHost', function () {
    it('returns localhost', function () {
      configHelpers.getMainAppHost().should.eql('localhost',
        'default host location is wrong.');
    });
  });

  describe('getServerUrl', function () {
    it('returns the whole server url', function () {
      configHelpers.getServerUrl().should.eql('http://localhost:19104',
        'default server url is wrong.');
    });
  });
});
