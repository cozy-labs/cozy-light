var fs = require('fs-extra');
var touch = require('touch');
var pathExtra = require('path-extra');
require('should');
var assert = require('assert');
var requestJSON = require('request-json-light');
var cozyLight = require('../lib/cozy-light');

var actions = cozyLight.actions;
var configHelpers = cozyLight.configHelpers;

var workingDir = pathExtra.join(__dirname, '.test-working_dir');
var fixturesDir = pathExtra.join(__dirname, 'fixtures');


before(function(){
  try {
    fs.removeSync(workingDir);
  } catch(err) {
    console.log(err);
  }
  fs.mkdirSync(workingDir);
  cozyLight.init({home: workingDir});
});


after(function(done){
  cozyLight.stop(function(){
    try {
      fs.removeSync(workingDir);
    } catch(err) {
      console.log(err);
    }
    done();
  });
});

describe('Functional tests', function () {

  describe('Hot app install', function () {

    it('starts the main server.', function (done) {
      var opt = {port: 8090};
      actions.start(opt, done);
    });

    it('install fake app manually.', function (done) {
      this.timeout(60000);
      var testapp = pathExtra.join(fixturesDir, 'test-app');
      // actions.once('restarted', done);
      actions.installApp(testapp, function (err) {
        assert.equal(err, null, 'Cannot install test-app.');
        done();
      });
    });

    it('install test-app2 manually.', function (done) {
      this.timeout(60000);
      var testapp2 = pathExtra.join(fixturesDir, 'test-app2');
      // actions.once('restarted', done);
      actions.installApp(testapp2, function (err) {
        assert.equal(err, null, 'Cannot install test-app2.');
        done();
      });
    });

    it('change configuration file.', function (done) {
      touch.sync(configHelpers.getConfigPath());
      done();
      this.timeout(60000);
    });

    it('fake app should be started.', function (done) {
      var client = requestJSON.newClient('http://localhost:18001');
      client.get('', function assertResponse (err, res) {
        assert.equal(err, null, 'An error occurred while accessing test-app2.');
        res.statusCode.should.eql(200, 'Wrong return code for test-app2.');
        done();
      });
    });

    it('test-app2 should be started.', function (done) {
      var client = requestJSON.newClient('http://localhost:18002');
      client.get('', function assertResponse (err, res) {
        assert.equal(err, null, 'An error occurred while accessing test-app.');
        res.statusCode.should.eql(200, 'Wrong return code for test-app.');
        actions.stop(done);
      });
    });

    it('should uninstall test-app.', function (done) {
      this.timeout(60000);
      var testapp2 = 'test-app';
      actions.uninstallApp(testapp2, function (err) {
        assert.equal(err, null, 'Cannot uninstall ' + testapp2 + '.');
        done();
      });
    });

    it('should uninstall test-app2.', function (done) {
      this.timeout(60000);
      var testapp2 = 'test-app2';
      actions.uninstallApp(testapp2, function (err) {
        assert.equal(err, null, 'Cannot uninstall ' + testapp2 + '.');
        done();
      });
    });

    it('should stop.', function (done) {
      actions.stop(done);
    });
  });

  describe('Do not start disabled app', function () {

    after(function (done) {
      actions.stop(function(){
        actions.enable('test-app');
        done();
      });
    });

    it('install an app.', function (done) {
      // Nothing to do test app is still in the cozy-light folder.
      var testapp = pathExtra.join(fixturesDir, 'test-app');
      actions.installApp(testapp, function (err) {
        assert.equal(err, null, 'Cannot install ' + testapp + '.');
        done();
      });
    });

    it('disable it.', function (done) {
      var testapp = 'test-app';
      actions.disable(testapp);
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

    it('wait 1s.', function (done) {
      setTimeout(done, 1000);
    });

    it('ensure initial source code.', function (done) {
      var client = requestJSON.newClient('http://localhost:18001');
      client.get('', function assertResponse (err, res, body) {
        assert.equal(err, null, 'An error occurred while accessing test app.');
        body.ok.should.eql(true, 'Wrong reloaded response body for test app.');
        done();
      });
    });

    it('change application code.', function (done) {
      var appHome = configHelpers.modulePath('test-app');
      var serverFile = appHome + '/server.js';
      var content = fs.readFileSync(serverFile, 'utf-8');
      content = content.replace('send({ok: true})', 'send({ok: false})');
      fs.writeFileSync(serverFile, content);
      done();
    });

    it('restart cozy-light.', function (done) {
      this.timeout(5000);
      actions.restart({}, done);
      done();
    });

    it('fake app should be started.', function (done) {
      var client = requestJSON.newClient('http://localhost:18001');
      client.get('', function assertResponse (err, res, body) {
        var appHome = configHelpers.modulePath('test-app');
        var serverFile = appHome + '/server.js';
        var content = fs.readFileSync(serverFile, 'utf-8');
        content = content.replace(
          'send({ok: false})', 'send({ok: true})');
        fs.writeFileSync(serverFile, content);

        assert.equal(err, null,
          'An error occurred while accessing test app.');
        res.statusCode.should.eql(200,
          'Wrong return code for test app.');
        body.ok.should.eql(false,
          'Wrong reloaded response body for test app.');
        done();
      });
    });
  });

  describe('Distro install', function () {

    it.skip('install a new distro.', function () {
    });
  });
});
