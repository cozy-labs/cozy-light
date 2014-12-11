var fs = require('fs-extra');
var pathExtra = require('path-extra');
var assert = require('assert');
var requestJSON = require('request-json-light');
var request = require('request');
var PouchDB = require('pouchdb');
var cozyLight = require('../lib/cozy-light');

var actions = cozyLight.actions;
//var controllers = cozyLight.controllers;
var configHelpers = cozyLight.configHelpers;
var npmHelpers = cozyLight.npmHelpers;
var nodeHelpers = cozyLight.nodeHelpers;
var applicationHelpers = cozyLight.applicationHelpers;
//var mainAppHelper = cozyLight.mainAppHelper;

var workingDir = pathExtra.join( __dirname, '.test-working_dir');
var fixturesDir = pathExtra.join( __dirname, 'fixtures');
var HOME = workingDir;
var cozyHOME = pathExtra.join(HOME, '.cozy-light' );


before(function(){
  fs.removeSync(workingDir);
  fs.mkdirSync(workingDir);
});


after(function(){
  try {
    fs.removeSync(workingDir);
  } catch(err) {
    console.log(err);
  }
});


describe('Config Helpers', function () {
  before(function (done) {
    this.timeout(10000);
    fs.remove(HOME, done);
  });

  describe('init', function () {
    it('should initialize Home directory', function () {
      this.timeout(50000);
      configHelpers.init(HOME);
      assert(fs.existsSync(HOME), 'HOME directory not created');
      assert(fs.existsSync(pathExtra.join(cozyHOME, 'config.json')),
             'configuration file not created');
    });
  });

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
          pathExtra.resolve(HOME), '.cozy-light', 'node_modules', 'app'),
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

  describe('watch/unwatchConfig', function(){
    it('should add watchers to watcher list on adding', function () {
      this.watcher = function () {};
      configHelpers.watchConfig(this.watcher);
      assert.equal(this.watcher, configHelpers.watchers[0]);
    });

    it('should remove watchers to watcher list on adding', function () {
      configHelpers.unwatchConfig(this.watcher);
      assert(configHelpers.watchers.length === 0);
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


describe('Node Helpers', function () {
  it('clearRequireCache', function () {
    var baseModulePath = pathExtra.join(__dirname, 'fixtures', 'test-app');
    var modulePath = configHelpers.modulePath('test-app');
    fs.mkdirsSync(modulePath);
    fs.copySync(baseModulePath, modulePath);
    require(modulePath);
    assert(
      require.cache[pathExtra.join(modulePath,'/server.js')] !== undefined,
      'Module should be cached before clearing it.');
    nodeHelpers.clearRequireCache('test-app');
    assert(
      require.cache[pathExtra.join(modulePath,'/server.js')] === undefined,
      'Module should not be cached anymore after clearing it.');
  });
  it.skip('clearCloseServer', function(){});
});


describe('NPM Helpers', function () {

  describe('install', function () {
    it('should install a module.', function (done) {
      this.timeout(60000);
      process.chdir(cozyHOME);
      var destPath = configHelpers.modulePath('hello');
      npmHelpers.install('cozy-labs/hello', function (err) {
        assert.equal(err, null, 'Cannot install module.');
        assert(fs.existsSync(destPath),
          'Module is not installed in the cozy-light folder.');
        done();
      });
    });
    it('should link a module.', function (done) {
      process.chdir(cozyHOME);
      var testapp = pathExtra.join(fixturesDir, 'test-app');
      var destPath = configHelpers.modulePath('hello');
      npmHelpers.link(testapp, function (err) {
        console.log(err);
        assert.equal(err, null, 'Cannot link module.');
        assert(fs.existsSync(destPath),
          'Module is not linked in the cozy-light folder.');
        done();
      });
    });
  });

  describe('uninstall', function(){
    it('should remove a remote module.', function (done) {
      process.chdir(cozyHOME);
      var destPath = configHelpers.modulePath('hello');
      npmHelpers.uninstall('hello', function (err) {
        assert.equal(err, null, 'Cannot uninstall module.');
        assert(!fs.existsSync(destPath),
          'Module is not removed from the cozy-light folder.');
        done();
      });
    });
    it('should remove a local module.', function (done) {
      process.chdir(cozyHOME);
      var destPath = configHelpers.modulePath('test-app');
      npmHelpers.uninstall('test-app', function (err) {
        assert.equal(err, null, 'Cannot uninstall module.');
        assert(!fs.existsSync(destPath),
          'Module is not removed from the cozy-light folder.');
        done();
      });
    });
  });

  describe('fetchManifest', function(){
    it('should fetch manifest from a remote module', function (done) {
      this.timeout(60000);
      npmHelpers.fetchManifest('cozy-labs/hello',
        function (err, manifest, type) {
          assert.equal(err, null, 'Cannot fetch manifest.');
          assert.equal('url', type);
          assert.equal('hello', manifest.name);
          done();
        });
    });
    it('should fetch manifest from an absolute module path.', function (done) {
      var testapp = pathExtra.join(fixturesDir, 'test-app');
      npmHelpers.fetchManifest(testapp, function (err, manifest, type) {
        assert.equal(err, null, 'Cannot fetch from ' + testapp + '.');
        assert.equal('file', type);
        assert.equal('test-app', manifest.name);
        done();
      });
    });
    it('should fetch manifest from a relative module path.', function (done) {
      var testapp = pathExtra.join(fixturesDir, 'test-app');
      npmHelpers.fetchManifest(testapp, function (err, manifest, type) {
        assert.equal(err, null, 'Cannot fetch from ' + testapp + '.');
        assert.equal('file', type);
        assert.equal('test-app', manifest.name);
        done();
      });
    });
  });

  describe('fetchInstall', function(){
    it('should fetch then install remote module.', function (done) {
      this.timeout(60000);
      npmHelpers.fetchInstall('cozy-labs/hello',
        function (err, manifest, type) {
          assert.equal(err, null, 'Cannot install module.');
          assert.equal('url', type);
          assert.equal('hello', manifest.name);
          done();
        });
    });
    it('should fetch then install an absolute module path.', function (done) {
      var testapp = pathExtra.join(fixturesDir, 'test-app');
      npmHelpers.fetchManifest(testapp, function (err, manifest, type) {
        assert.equal(err, null, 'Cannot install from ' + testapp + '.');
        assert.equal('file', type);
        assert.equal('test-app', manifest.name);
        done();
      });
    });
    it('should fetch then install a relative module path.', function (done) {
      var testapp = pathExtra.join(fixturesDir, 'test-app');
      npmHelpers.fetchManifest(testapp, function (err, manifest, type) {
        assert.equal(err, null, 'Cannot install from ' + testapp + '.');
        assert.equal('file', type);
        assert.equal('test-app', manifest.name);
        done();
      });
    });
  });
});


describe('Main App Helpers', function () {

  it.skip('initializeProxy', function(){});

  it.skip('start', function(){
  });

  it.skip('stop', function(){
  });

  it.skip('exit', function(){
  });

});


describe('Plugin Helpers', function () {
  it.skip('start', function(){});
  it.skip('stop', function(){});
  it.skip('startAll', function(){});
  it.skip('stopAll', function(){});
});


describe('Application Helpers', function () {

  describe('start', function () {
    it('should start a server for given application', function (done) {
      this.timeout(10000);
      var source = pathExtra.join(fixturesDir, 'test-app');
      var dest = configHelpers.modulePath('test-app');
      fs.copySync(source, dest);

      var sourceExpress = pathExtra.join(
        __dirname, '..', 'node_modules', 'express');
      var destExpress = pathExtra.join(dest, 'node_modules', 'express');
      fs.copySync(sourceExpress, destExpress);

      var manifest = require(pathExtra.join(dest, 'package.json'));
      manifest.type = 'classic';
      var db = new PouchDB('test');
      applicationHelpers.start(manifest, db,
        function assertAccess () {
          var client = requestJSON.newClient('http://localhost:18001');
          client.get('', function assertResponse (err, res) {
            assert.equal(err, null,
              'An error occurred while accessing test app.');
            assert.equal(res.statusCode, 200,
              'Wrong return code for test app.');
            done();
          });
        });
    });
  });

  describe('stop', function () {
    it('should stop running server for given application', function (done) {
      var appHome = configHelpers.modulePath('test-app');
      var manifest = require(pathExtra.join(appHome, 'package.json'));
      manifest.type = 'classic';

      applicationHelpers.stop(manifest, function assertStop () {
        var client = requestJSON.newClient('http://localhost:18001');
        client.get('', function assertResponse(err) {
          assert.notEqual(err, null,
            'Application should not be accessible anymore.');
          done();
        });
      });
    });
  });

  it.skip('startAll', function(){});
  it.skip('stopAll', function(){});
});


describe('Controllers', function () {

  it.skip('proxyPrivate', function(){
  });

  it.skip('proxyPublic', function(){
  });

});


describe('actions', function () {

  describe('start', function () {
    it('should listen and respond to http requests.', function (done) {
      var opt = {port: 8090};
      actions.start(opt, function(err) {
        assert.equal(err, null, 'Cannot start server');
        request('http://localhost:' + opt.port + '/',
          function(error, response){
            assert.equal(error, null,
              'An error occurred while accessing test app.');
            assert.equal(response.statusCode, 404,
              'Wrong return code for test app.');
            done();
          });
      });
    });
  });

  describe('installApp', function () {
    it('should add app folders and update configuration.', function (done) {
      this.timeout(60000);
      var app = 'cozy-labs/hello';
      actions.installApp(app, function (err) {
        assert.equal(err, null, 'Cannot install app.');
        var config = configHelpers.loadConfigFile();
        console.log(config.apps);
        assert.equal('hello', config.apps[app].name);
        done();
      });
    });
  });

  describe('addPlugin', function () {
    it('should add plugin folder and update configuration. ', function (done) {
      var testPlugin = pathExtra.join(fixturesDir, 'test-plugin');
      actions.installPlugin(testPlugin, function (err) {
        assert.equal(err, null, 'Cannot install plugin.');
        var config = configHelpers.loadConfigFile();
        assert.equal('test-plugin', config.plugins[testPlugin].name);
        done();
      });
    });
  });

  describe('disable', function () {

    it('should mark app as disabled in the config file.', function (done) {
      var app = 'cozy-labs/hello';
      actions.disable(app);
      var config = configHelpers.loadConfigFile();
      assert(config.apps[app].disabled === true);
      done();
    });

    it('should mark plugin as disabled in the config file.', function (done) {
      var plugin = pathExtra.join(fixturesDir, 'test-plugin');
      actions.disable(plugin);
      var config = configHelpers.loadConfigFile();
      assert(config.plugins[plugin].disabled === true);
      done();
    });

  });

  describe('enable', function () {

    it('should remove disabled from the config file (app).',
       function (done) {
      var app = 'cozy-labs/hello';
      actions.enable(app);
      var config = configHelpers.loadConfigFile();
      assert(config.apps[app].disabled === undefined);
      done();
    });

    it('should remove disabled from the config file (plugin).',
       function (done) {
      var plugin = pathExtra.join(fixturesDir, 'test-plugin');
      actions.enable(plugin);
      var config = configHelpers.loadConfigFile();
      assert(config.plugins[plugin].disabled === undefined);
      done();
    });

  });

  describe('uninstallApp', function () {
    it('should remove app folder and update configuration. ', function (done) {
      var app = 'cozy-labs/hello';
      actions.uninstallApp(app, function (err) {
        assert.equal(err, null, 'Cannot uninstallApp app.');
        var config = configHelpers.loadConfigFile();
        assert.equal(config.apps[app], undefined);
        done();
      });
    });
  });

  describe('removePlugin', function () {
    it('should remove plugin and update configuration. ', function (done) {
      var testPlugin = pathExtra.join(fixturesDir, 'test-plugin');
      actions.uninstallPlugin(testPlugin, function (err) {
        assert.equal(err, null, 'Cannot uninstall plugin.');
        var config = configHelpers.loadConfigFile();
        assert.equal(config.plugins[testPlugin], undefined);
        done();
      });
    });
  });

  after(function(done){
    actions.stop(done);
  });

});


describe('Functional tests', function () {

  after(function(done){
    actions.exit(done);
  });

  describe('Hot app install', function () {

    it('starts the main server.', function (done) {
      var opt = {port: 8090};
      actions.start(opt, done);
    });

    it('install fake app manually.', function (done) {
      // Nothing to do test app is still in the cozy-light folder.
      done();
    });

    it('change configuration file.', function (done) {
      var appHome = configHelpers.modulePath('test-app');
      var manifest = require(pathExtra.join(appHome, 'package.json'));
      configHelpers.addApp('test-app', manifest);
      done();
    });

    it('wait 1s.', function (done) {
      setTimeout(done, 1000);
    });

    it('fake app should be started.', function (done) {
      var client = requestJSON.newClient('http://localhost:18001');
      client.get('', function assertResponse (err, res) {
        assert.equal(err, null, 'An error occurred while accessing test app.');
        assert.equal(res.statusCode, 200, 'Wrong return code for test app.');
        actions.stop(done);
      });
    });
  });

  describe('Do not start disabled app', function () {

    after(function (done) {
      actions.enable('test-app');
      actions.stop(done);
    });

    it('install an app.', function (done) {
      // Nothing to do test app is still in the cozy-light folder.
      done();
    });

    it('disable it.', function (done) {
      actions.disable('test-app');
      done();
    });

    it('starts the main server.', function (done) {
      var opt = {port: 8090};
      actions.start(opt, done);
    });

    it('disabled app should not be started.', function (done) {
      var client = requestJSON.newClient('http://localhost:18001');
      client.get('', function assertResponse (err) {
        assert(err !== null);
        done();
      });
    });

  });

  describe('Hot app reload', function () {

    it('starts the main server.', function (done) {
      var opt = {port: 8090};
      actions.start(opt, done);
    });

    it('install fake app manually.', function (done) {
      // Nothing to do test app is still in the cozy-light folder.
      done();
    });

    it('wait 1s.', function (done) {
      setTimeout(done, 1000);
    });

    it('ensure initial source code.', function (done) {
      var client = requestJSON.newClient('http://localhost:18001');
      client.get('', function assertResponse (err, res, body) {
        assert.equal(err, null, 'An error occurred while accessing test app.');
        assert.equal(body.ok, true,
          'Wrong reloaded response body for test app.');
        done();
      });
    });

    it('change application code.', function (done) {
      var appHome = configHelpers.modulePath('test-app');
      var serverFile = appHome + '/server.js';
      var content = fs.readFileSync(serverFile,'utf-8');
      content = content.replace('send({ok: true})','send({ok: false})');
      fs.writeFileSync(serverFile, content);
      done();
    });

    it('restart cozy-light.', function (done) {
      actions.restart(done);
    });

    it('fake app should be started.', function (done) {
      var client = requestJSON.newClient('http://localhost:18001');
      client.get('', function assertResponse (err, res, body) {
        assert.equal(err, null,
          'An error occurred while accessing test app.');
        assert.equal(res.statusCode, 200,
          'Wrong return code for test app.');
        assert.equal(body.ok, false,
          'Wrong reloaded response body for test app.');
        var appHome = configHelpers.modulePath('test-app');
        var serverFile = appHome + '/server.js';
        var content = fs.readFileSync(serverFile,'utf-8');
        content = content.replace(
          'send({ok: false})', 'send({ok: true})');
        fs.writeFileSync(serverFile,content);
        done();
      });
    });
  });

  describe('Distro install', function () {

    it.skip('install a new distro.', function () {
    });
  });
});
