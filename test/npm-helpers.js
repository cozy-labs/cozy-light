
var fs = require('fs-extra');
var pathExtra = require('path-extra');
var assert = require('assert');
require('should');

var cozyLight = require('../lib/cozy-light');
var configHelpers = cozyLight.configHelpers;
var npmHelpers = cozyLight.npmHelpers;

var fixturesDir = pathExtra.join(__dirname, 'fixtures');
var workingDir = pathExtra.join(__dirname, '.test-working_dir');


describe('NPM Helpers', function () {

  describe('install', function () {

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

    it('should install a module.', function (done) {
      this.timeout(60000);
      var destPath = configHelpers.modulePath('hello');
      npmHelpers.install('cozy-labs/hello', function (err) {
        assert.equal(err, null, 'Cannot install module.');
        fs.existsSync(destPath).should.eql(true,
          'Module is not linked in the cozy-light folder.');
        done();
      });
    });

    it('should link a module.', function (done) {
      var testapp = pathExtra.join(fixturesDir, 'test-app');
      var destPath = configHelpers.modulePath('test-app');
      npmHelpers.link(testapp, function (err) {
        assert.equal(err, null, 'Cannot link module.');
        fs.existsSync(destPath).should.eql(true,
          'Module is not linked in the cozy-light folder.');
        done();
      });
    });
  });

  describe('uninstall', function(){

    before(function(){
      fs.removeSync(workingDir);
      fs.mkdirSync(workingDir);
      process.chdir(workingDir);
    });

    after(function(){
      try {
        fs.removeSync(workingDir);
      } catch(err) {
        console.log(err);
      }
    });

    it('should remove a remote module.', function (done) {
      this.timeout(60000);
      var destPath = configHelpers.modulePath('hello');
      var srcModule = 'cozy-labs/hello';
      process.chdir(workingDir);
      npmHelpers.install(srcModule, function (installErr) {
        assert.equal(installErr, null, 'Cannot install module.');
        fs.existsSync(destPath).should.eql(true,
          'Module is not linked in the cozy-light folder.');
        npmHelpers.uninstall('hello', function (uninstallErr) {
          assert.equal(uninstallErr, null, 'Cannot uninstall module.');
          fs.existsSync(destPath).should.eql(false,
            'Module is not removed from the cozy-light folder. ' + destPath);
          done();
        });
      });
    });

    it('should remove a local module.', function (done) {
      var destPath = configHelpers.modulePath('test-app');
      var testapp = pathExtra.join(fixturesDir, 'test-app');
      assert(!fs.existsSync(destPath),
        'Module is not removed from the cozy-light folder.');
      npmHelpers.link(testapp, function (installErr) {
        assert.equal(installErr, null, 'Cannot install module.');
        fs.existsSync(destPath).should.eql(true,
          'Module is not linked in the cozy-light folder.');
        process.chdir(workingDir);
        npmHelpers.uninstall('test-app', function (uninstallErr) {
          assert.equal(uninstallErr, null, 'Cannot uninstall module.');
          fs.existsSync(destPath).should.eql(false,
            'Module is not removed from the cozy-light folder.');
          done();
        });
      });
    });
  });

  describe('fetchManifest', function(){

    before(function(){
      fs.removeSync(workingDir);
      fs.mkdirSync(workingDir);
      process.chdir(workingDir);
    });

    after(function(){
      try {
        fs.removeSync(workingDir);
      } catch(err) {
        console.log(err);
      }
    });

    it('should fetch manifest from npm registry', function (done) {
      this.timeout(60000);
      npmHelpers.fetchManifest('cozy-labs/hello',
        function (err, manifest, type) {
          assert.equal(err, null, 'Cannot fetch manifest.');
          if (!err) {
            type.should.eql('url');
            manifest.name.should.eql('hello');
          }
          done();
        });
    });

    it('should fetch manifest from a remote module', function (done) {
      this.timeout(60000);
      npmHelpers.fetchManifest('cozy-labs/hello',
        function (err, manifest, type) {
          assert.equal(err, null, 'Cannot fetch manifest.');
          if (!err) {
            type.should.eql('url');
            manifest.name.should.eql('hello');
          }
          done();
        });
    });

    it('should fetch manifest from an absolute module path.', function (done) {
      var testapp = pathExtra.join(fixturesDir, 'test-app');
      npmHelpers.fetchManifest(testapp, function (err, manifest, type) {
        assert.equal(err, null, 'Cannot fetch from ' + testapp + '.');
        if (!err) {
          type.should.eql('file');
          manifest.name.should.eql('test-app');
        }
        done();
      });
    });
    it('should fetch manifest from a relative module path.', function (done) {
      var testapp = pathExtra.join(fixturesDir, 'test-app');
      npmHelpers.fetchManifest(testapp, function (err, manifest, type) {
        assert.equal(err, null, 'Cannot fetch from ' + testapp + '.');
        type.should.eql('file');
        manifest.name.should.eql('test-app');
        done();
      });
    });
  });

});
