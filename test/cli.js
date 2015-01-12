
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
  var open_process = function(cmds, then){
    console.error('+ ' + cmds.join(' '));
    var bin = cmds.shift();
    var cozyProcess = spawn(bin, cmds);
    cozyProcess.stdout.on('data', log_output);
    cozyProcess.stderr.on('data', log_output);
    if ( then ){
      var output = '';
      var stdout = '';
      var stderr = '';
      cozyProcess.stdout.on('data', function (d) {
        output += d;
        stdout += d;
      });
      cozyProcess.stderr.on('data', function (d) {
        output += d;
        stderr += d;
      });
      cozyProcess.on('close', function (code) {
        then(output, stdout, stderr, code);
      });
    }
    return cozyProcess;
  };

  this.timeout(60000);
  it('displays help', function(done){
    var cmd = [
      'cozy-light',
      '--help'
    ];
    open_process(cmd, function(output, stdout, stderr){
      output.should.match(/Usage: cozy-light/);
      done();
    });
  });
  it('starts properly', function(done){
    var cmd = [
      'cozy-light',
      'start'
    ];
    var cozyProcess = open_process(cmd);
    setTimeout(function(){
      request.get('http://localhost:19104/' , function(error, response){
        response.statusCode.should.match(/404/);
        cozyProcess.kill('SIGINT');
        done();
      });
    },1000);
  });
  it('creates the mutex', function(done){
    var cmd = [
      'cozy-light',
      'start'
    ];
    var cozyProcess = open_process(cmd)
      .on('close',function(){
        done();
      });
    setTimeout(function(){
      var p = pathExtra.join(homeDir, 'mutex');
      fs.existsSync(p).should.eql(true);
      cozyProcess.kill('SIGINT');
    },1000);
  });
  it('deletes the mutex', function(done){
    var cmd = [
      'cozy-light',
      'start'
    ];
    var cozyProcess = open_process(cmd)
      .on('close',function(){
        var p = pathExtra.join(homeDir, 'mutex');
        fs.existsSync(p).should.eql(false);
        done();
      });
    setTimeout(function(){
      var p = pathExtra.join(homeDir, 'mutex');
      fs.existsSync(p).should.eql(true);
      cozyProcess.kill('SIGINT');
    },1000);
  });
  it('does not start twice', function(done){
    var cmd = [
      'cozy-light',
      'start'
    ];
    var cozyProcess = open_process(cmd)
      .on('close', function (code) {
      code.should.eql(0);
      done();
    });
    setTimeout(function(){
      var cmd = [
        'cozy-light',
        'start'
      ];
      open_process(cmd).on('close', function (code) {
        code.should.eql(8 /* not sure why 8 */ );
        cozyProcess.kill('SIGINT');
      });
    },1000);
  });
  it('can install plugin', function(done){
    var cmd = [
      'cozy-light',
      'add-plugin',
      'maboiteaspam/cozy-homepage'
    ];
    open_process(cmd, function(output, stdout, stderr, code){
      output.should.match(/Enjoy!/);
      stderr.should.eql('');
      code.should.eql(0);
      done();
    });
  });
  it('can install app', function(done){
    var cmd = [
      'cozy-light',
      'install',
      'maboiteaspam/cozy-dashboard'
    ];
    open_process(cmd, function(output, stdout, stderr, code){
      output.should.match(/Enjoy!/);
      stderr.should.eql('');
      code.should.eql(0);
      done();
    });
  });
  it.skip('can install distro', function(){});
  it('displays content properly', function(done){
    var cmd = [
      'cozy-light',
      'start'
    ];
    var cozyProcess = open_process(cmd)
      .on('close', function (code) {
        code.should.eql(0);
        done();
      });
    setTimeout(function(){
      var url = 'http://localhost:19104/apps/cozy-dashboard/';
      request.get(url, function(error, response, body){
        console.error(response.statusCode)
        body.should.match(/Cozy Light: Your Personal Cloud at Home/);
        response.statusCode.should.eql(200);
        cozyProcess.kill('SIGINT');
      });
    },2000);
  });
  it.skip('can remove app', function(){});
  it.skip('can remove plugin', function(){});
  it('can stop properly', function(done){
    var cmd = [
      'cozy-light',
      'start'
    ];
    var cozyProcess = open_process(cmd)
      .on('close', function (code) {
        code.should.eql(0);
        done();
      });
    setTimeout(function(){
      request.get('http://localhost:19104/' , function(error, response, body){
          console.error(response.statusCode)
          body.should.match(/Cozy Light: Your Personal Cloud at Home/);
          response.statusCode.should.eql(200);
          cozyProcess.kill('SIGINT');
      });
    },2000);
  });
});
