var fs = require('fs-extra');
var pathExtra = require('path-extra');
var assert = require('assert');
var requestJSON = require('request-json-light');
var request = require('request');
var PouchDB = require('pouchdb');
var cozyLight = require('../lib/cozy-light');
var configWatcher = require('../lib/config-watcher');

var actions = cozyLight.actions;
var configHelpers = cozyLight.configHelpers;
var npmHelpers = cozyLight.npmHelpers;
var nodeHelpers = cozyLight.nodeHelpers;
var applicationHelpers = cozyLight.applicationHelpers;

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




describe('Controllers', function () {

  it.skip('proxyPrivate', function(){
  });

  it.skip('proxyPublic', function(){
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

    it('install test-app2 manually.', function (done) {
      this.timeout(60000);
      var testapp2 = pathExtra.join(fixturesDir, 'test-app2');
      actions.installApp(testapp2, function (err) {
        assert.equal(err, null, 'Cannot install test-app2.');
        done();
      });
    });

    it('change configuration file.', function (done) {
      var appHome = configHelpers.modulePath('test-app');
      var manifest = require(pathExtra.join(appHome, 'package.json'));
      configHelpers.addApp('test-app', manifest);
      done();
    });

    it('wait 1s.', function (done) {
      setTimeout(function () {
        done();
      }, 1000);
    });

    it('fake app should be started.', function (done) {
      var client = requestJSON.newClient('http://localhost:18002');
      client.get('', function assertResponse (err, res) {
        assert.equal(err, null, 'An error occurred while accessing test app.');
        assert.equal(res.statusCode, 200, 'Wrong return code for test app.');
        done();
      });
    });

    it('test-app2 should be started.', function (done) {
      var client = requestJSON.newClient('http://localhost:18001');
      client.get('', function assertResponse (err, res) {
        assert.equal(err, null, 'An error occurred while accessing test app.');
        assert.equal(res.statusCode, 200, 'Wrong return code for test app.');
        actions.stop(done);
      });
    });

    it('should uninstall.', function (done) {
      this.timeout(60000);
      var testapp2 = pathExtra.join(fixturesDir, 'test-app2');
      actions.uninstallApp(testapp2, function (err) {
        assert.equal(err, null, 'Cannot uninstall test-app2.');
        done();
      });
    });

    it('should stop.', function (done) {
      actions.stop(done);
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
