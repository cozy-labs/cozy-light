
var fs = require('fs-extra');
var pathExtra = require('path-extra');
var request = require('request');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var assert = require('assert');
require('should');

var homeDir = pathExtra.join(pathExtra.homedir(),
  'cozy');

describe('CLI', function () {

  before(function(){
    var mutexFile = pathExtra.join(homeDir, 'mutex');
    if( fs.existsSync(mutexFile) ) {
      fs.unlinkSync(mutexFile);
    }
  });

  var log_output = function(c){
    console.error((c + '').replace(/(.+)(\s+)?$/im, '$1'));
  };

  this.timeout(60000);
  it('displays help', function(done){
    var output = '';
    var cozyProcess = spawn('cozy-light', ['--help'])
      .on('close', function () {
        output.should.match(/Usage: cozy-light/);
        done();
      });
    cozyProcess.stdout.on('data', log_output);
    cozyProcess.stderr.on('data', log_output);
    cozyProcess.stdout.on('data', function (d) {
      output += d;
    });
    cozyProcess.stderr.on('data', function (d) {
      output += d;
    });
  });
  it('starts properly', function(done){
    var cozyProcess = spawn('cozy-light', ['start']);
    cozyProcess.stdout.on('data', log_output);
    cozyProcess.stderr.on('data', log_output);
    setTimeout(function(){
      request.get('http://localhost:19104/' , function(error, response){
        response.statusCode.should.match(/404/);
        cozyProcess.kill('SIGINT');
        setTimeout(function(){
          done();
        },1000);
      });
    },1000);
  });
  it('creates the mutex', function(done){
    var cozyProcess = spawn('cozy-light', ['start']);
    cozyProcess.stdout.on('data', log_output);
    cozyProcess.stderr.on('data', log_output);
    setTimeout(function(){
      var p = pathExtra.join(homeDir,
        'mutex');
      fs.existsSync(p).should.eql(true);
      cozyProcess.kill('SIGINT');
      setTimeout(function(){
        done();
      },1000);
    },1000);
  });
  it('deletes the mutex', function(done){
    var cozyProcess = spawn('cozy-light', ['start']);
    cozyProcess.stdout.on('data', log_output);
    cozyProcess.stderr.on('data', log_output);
    setTimeout(function(){
      var p = pathExtra.join(homeDir, 'mutex');
      fs.existsSync(p).should.eql(true);
      cozyProcess.kill('SIGINT');
      setTimeout(function(){
        var p = pathExtra.join(homeDir, 'mutex');
        fs.existsSync(p).should.eql(false);
        done();
      },1000);
    },1000);
  });
  it('does not start twice', function(done){
    var cozyProcess = spawn('cozy-light', ['start'])
      .on('close', function (code) {
        code.should.eql(0);
      });
    cozyProcess.stdout.on('data', log_output);
    cozyProcess.stderr.on('data', log_output);
    setTimeout(function(){
      var cozyProcess2 = spawn('cozy-light', ['start'])
        .on('close', function (code) {
          code.should.eql(8 /* not sure why 8 */ );
          cozyProcess.kill('SIGINT');
          cozyProcess2.kill('SIGINT');
          setTimeout(function(){
            done();
          },1000);
        });
      cozyProcess2.stdout.on('data', log_output);
      cozyProcess2.stderr.on('data', log_output);
    },1000);
  });
  it('can install plugin', function(done){
    var cmd  = [
      'cozy-light',
      'add-plugin',
      'maboiteaspam/cozy-homepage'
    ].join(' ');
    exec(cmd,function(error, stdout, stderr){
      log_output(stdout);
      log_output(stderr);
      stdout.should.match(/Enjoy!/);
      stderr.should.eql('');
      assert.equal(error,null,'error must be null.');
      done();
    })
  });
  it('can install app', function(done){
    var cmd  = [
      'cozy-light',
      'install',
      'cozy-labs/cozy-light-simple-dashboard'
    ].join(' ');
    exec(cmd,function(error, stdout, stderr){
      stdout.should.match(/Enjoy!/);
      stderr.should.be.empty();
      assert.equal(error,null,'error must be null.');
      done();
    })
  });
  it.skip('can install distro', function(){});
  it('displays content properly', function(done){
    var cozyProcess = spawn('cozy-light', ['start'])
      .on('close', function () {
        done();
      });
    cozyProcess.stdout.on('data', log_output);
    cozyProcess.stderr.on('data', log_output);
    setTimeout(function(){
      var url = 'http://localhost:19104/apps/cozy-dashboard';
      request.get(url, function(error, response){
        response.statusCode.match(/301/);
        cozyProcess.kill('SIGINT');
      });
    },1000);
  });
  it.skip('can remove app', function(){});
  it.skip('can remove plugin', function(){});
  it('can stop properly', function(done){
    var cozyProcess = spawn('cozy-light', ['start'])
      .on('close', function (code) {
        code.should.eql(0);
        done();
      });
    cozyProcess.stdout.on('data', log_output);
    cozyProcess.stderr.on('data', log_output);
    setTimeout(function(){
      request.get('http://localhost:19104/' , function(){
        cozyProcess.kill('SIGINT');
      });
    },1000);});
});
