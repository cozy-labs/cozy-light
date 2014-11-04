var fs = require('fs-extra');
var pathExtra = require('path-extra');
var assert = require('assert');
var http = require('http');
var request = require('request-json-light');
var PouchDB = require('pouchdb');
var cozyLight = require('./cozy-light');

var actions = cozyLight.actions;
var configHelpers = cozyLight.configHelpers;
var npmHelpers = cozyLight.npmHelpers;
var serverHelpers = cozyLight.serverHelpers;

var workingDir = pathExtra.join( __dirname, '/.test-working_dir/');
var fixturesDir = pathExtra.join( __dirname, '/fixtures/');
var HOME = pathExtra.join(workingDir, '.cozy-light');


before(function(){
  fs.removeSync(workingDir);
  fs.mkdirSync(workingDir);
});


after(function(){
  fs.removeSync(workingDir);
});


describe('Config Helpers', function () {
  before(function (done) {
    this.timeout(10000);
    fs.remove(HOME, done);
  });

  describe('init', function () {
    it('should initialize Home directory', function () {
      this.timeout(10000);
      configHelpers.init(HOME);
      assert(fs.existsSync(HOME), 'HOME directory not created');
      assert(fs.existsSync(pathExtra.join(HOME, 'config.json')),
             'configuration file not created');
    });
  });

  describe('createConfigFile', function () {
    it('should create an empty config file', function () {
      configHelpers.createConfigFile();
      assert(fs.existsSync(pathExtra.join(HOME, 'config.json')),
        'configuration file not created');
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

  describe('removeApp', function(){
    it('should remove app manifest from the config file', function () {
      var app = 'cozy-labs/cozy-test';
      assert(configHelpers.removeApp(app), 'did not remove app correctly.');
      var config = configHelpers.loadConfigFile();
      assert.equal(undefined, config.apps[app]);
    });
  });

  describe('addPlugin', function(){
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

  describe('removePlugin', function(){
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

});


describe('NPM Helpers', function () {

  describe('install', function () {
    it('should install a remote module.', function (done) {
      this.timeout(60000);
      process.chdir(HOME);
      var destPath = configHelpers.modulePath('hello');
      npmHelpers.install('cozy-labs/hello', function (err) {
        assert.equal(err, null, 'Cannot install remote module.');
        assert(fs.existsSync(destPath),
          'Module is not installed in the cozy-light folder.');
        done();
      });
    });
    it('should install a local module.', function (done) {
      process.chdir(HOME);
      var testapp = pathExtra.join(fixturesDir, 'test-app');
      var destPath = configHelpers.modulePath('hello');
      npmHelpers.install(testapp, function (err) {
        assert.equal(err, null, 'Cannot install local module.');
        assert(fs.existsSync(destPath),
          'Module is not installed in the cozy-light folder.');
        done();
      });
    });
  });

  describe('uninstall', function(){
    it('should remove a remote module.', function (done) {
      process.chdir(HOME);
      var destPath = configHelpers.modulePath('hello');
      npmHelpers.uninstall('hello', function (err) {
        assert.equal(err, null, 'Cannot uninstall module.');
        assert(!fs.existsSync(destPath),
          'Module is not removed from the cozy-light folder.');
        done();
      });
    });
    it('should remove a local module.', function (done) {
      process.chdir(HOME);
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
          assert.equal(err, null, 'Cannot fetch remote manifest.');
          assert.equal('url', type);
          assert.equal('hello', manifest.name);
          done();
        });
    });
    it('should fetch manifest from a local module.', function (done) {
      var testapp = pathExtra.join(fixturesDir, 'test-app');
      npmHelpers.fetchManifest(testapp, function (err, manifest, type) {
        assert.equal(err, null, 'Cannot fetch local manifest.');
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
        assert.equal(err, null, 'Cannot install remote module.');
        assert.equal('url', type);
        assert.equal('hello', manifest.name);
        done();
      });
    });
    it('should fetch then install local module.', function (done) {
      var testapp = pathExtra.join(fixturesDir, 'test-app');
      npmHelpers.fetchManifest(testapp, function (err, manifest, type) {
        assert.equal(err, null, 'Cannot install local module.');
        assert.equal('file', type);
        assert.equal('test-app', manifest.name);
        done();
      });
    });
  });
});


describe('Server Helpers', function () {

  it.skip('initializeProxy', function(){
  });

  it.skip('createApplicationServer', function(){
  });

  describe('startApplication', function () {
    it('should start a server for given application', function (done) {
      this.timeout(10000);
      var source = pathExtra.join(__dirname, 'fixtures', 'test-app');
      var dest = configHelpers.modulePath('test-app');
      fs.copySync(source, dest);

      var sourceExpress = pathExtra.join(__dirname, 'node_modules', 'express');
      var destExpress = pathExtra.join(dest, 'node_modules', 'express');
      fs.copySync(sourceExpress, destExpress);

      var manifest = require(pathExtra.join(dest, 'package.json'));
      manifest.type = 'classic';
      var db = new PouchDB('test');
      serverHelpers.startApplication(manifest, db, function assertAccess () {
        var client = request.newClient('http://localhost:18001');
        client.get('', function assertResponse (err, res) {
          assert.equal(err, null,
                       'An error occured while accessing test app.');
          assert.equal(res.statusCode, 200,
                       'Wrong return code for test app.');
          done();
        });
      });
    });
  });

  describe('stopApplication', function () {
    it('should stop running server for given application', function (done) {
      var appHome = configHelpers.modulePath('test-app');
      var manifest = require(pathExtra.join(appHome, 'package.json'));
      manifest.type = 'classic';

      serverHelpers.stopApplication(manifest, function assertStop () {
        var client = request.newClient('http://localhost:18001');
        client.get('', function assertResponse(err) {
          assert.notEqual(err, null,
                          'Application should not be accessible anymore.');
          done();
        });
      });
    });
  });

  describe('reloadApps', function() {

    it('should restart all apps', function(done) {
      var appHome = configHelpers.modulePath('test-app');
      var manifest = require(pathExtra.join(appHome, 'package.json'));
      configHelpers.addApp('test-app', manifest);

      serverHelpers.reloadApps(function assertAppAccess () {
        var client = request.newClient('http://localhost:18002');
        client.get('', function assertResponse (err, res) {
          assert.equal(err, null,
                      'An error occured while accessing test app.');
          assert.equal(res.statusCode, 200,
                       'Wrong return code for test app.');
          configHelpers.removeApp('test-app');
          serverHelpers.stopApplication(manifest, done);
        });
      });
      });

    it('should reload app source code', function(done) {
      var appHome = configHelpers.modulePath('test-app');
      var manifest = require(pathExtra.join(appHome, 'package.json'));
      manifest.type = 'classic';
      configHelpers.addApp('test-app', manifest);

      var db = new PouchDB('test');
      serverHelpers.startApplication(manifest, db, function assertAccess () {
        var client = request.newClient('http://localhost:18003');

        client.get('', function assertResponse (err, res, body) {
          assert.equal(err, null, 'An error occured while accessing test app.');
          assert.equal(res.statusCode, 200, 'Wrong return code for test app.');
          assert(body.ok, 'Wrong initial response body for test app.');

          var serverFile = appHome + '/server.js';
          var content = fs.readFileSync(serverFile,'utf-8');
          content = content.replace('send({ok: true})','send({ok: false})');
          fs.writeFileSync(serverFile, content);

          serverHelpers.reloadApps(function assertAppAccess () {
            client = request.newClient('http://localhost:18004');

            client.get('', function assertResponse (err, res, body) {
              assert.equal(err, null,
                           'An error occured while accessing test app.');
              assert.equal(res.statusCode, 200,
                           'Wrong return code for test app.');
              assert.equal(body.ok, false,
                           'Wrong reloaded response body for test app.');
              content = content.replace(
                'send({ok: false})', 'send({ok: true})');
              fs.writeFileSync(serverFile,content);
              configHelpers.removeApp('test-app');
              serverHelpers.stopApplication(manifest, done);
            });
          });
        });
      });
    });
  });

  it.skip('loadPlugins', function(){
  });

  it.skip('exitHandler', function(){
  });

});


describe('Controllers', function () {

  it.skip('index', function(){
  });

  it.skip('proxyPrivate', function(){
  });

  it.skip('proxyPublic', function(){
  });

  it.skip('automaticRedirect', function(){
  });

});


describe('actions', function () {

  describe('start', function () {
    it('should listen and respond to http requests.', function (done) {
      var opt = {port: 8090};
      actions.start(opt, function(err, app, server) {
       assert.equal(err, null, 'Cannot start server');
        var options = {
          host: 'localhost',
          port: opt.port
        };
        http.get(options, function(res) {
          res.setEncoding('utf8');
          var body = '';
          res.on('data', function (chunk) {
            body += chunk;
          });
          res.on('end', function () {
            var expected = 'Cozy Light: Your Personal Cloud at Home';
            assert(body.indexOf(expected) > -1);
            server.close();
            done();
          });
        }).on('error', function(e) {
          done(e);
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
        assert.equal('hello', config.apps[app].name);
        done();
      });
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

  it.skip('addPlugin', function () {});
  it.skip('removePlugin', function () {});

});


describe('Functional tests', function () {
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
      var client = request.newClient('http://localhost:18005');
      client.get('', function assertResponse (err, res) {
        assert.equal(err, null, 'An error occured while accessing test app.');
        assert.equal(res.statusCode, 200, 'Wrong return code for test app.');
        done();
      });
    });
  });
});
