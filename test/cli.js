
var fs = require('fs-extra');
var pathExtra = require('path-extra');
var request = require('request');
var spawn = require('child_process').spawn;
require('should');

var workingDir = pathExtra.join( __dirname, '.test-working_dir');

describe('CLI', function () {

  before(function(){
    fs.removeSync(workingDir);
    fs.mkdirSync(workingDir);
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
  it('detects cli options', function(done){
    var cmd = [
      'cozy-light',
      'display-config',
      '--home',
      workingDir
    ];
    open_process(cmd, function(output, stdout, stderr){
      output.should.match(new RegExp(workingDir));
      done();
    });
  });
  it('can install plugin', function(done){
    var cmd = [
      'cozy-light',
      'add-plugin',
      'maboiteaspam/cozy-homepage',
      '--home',
      workingDir
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
      'maboiteaspam/cozy-dashboard',
      '--home',
      workingDir
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
      'start',
      '--home',
      workingDir
    ];
    var cozyProcess = open_process(cmd)
      .on('close', function (code) {
        code.should.eql(0);
        done();
      });
    setTimeout(function(){
      var url = 'http://localhost:19104/apps/cozy-dashboard/';
      request.get(url, function(error, response, body){
        body.should.match(/Cozy Light: Your Personal Cloud at Home/);
        response.statusCode.should.eql(200);
        cozyProcess.kill('SIGINT');
      });
    },2000);
  });
  it('can stop properly', function(done){
    var cmd = [
      'cozy-light',
      'start',
      '--home',
      workingDir
    ];
    var cozyProcess = open_process(cmd)
      .on('close', function (code) {
        code.should.eql(0);
        done();
      });
    setTimeout(function(){
      request.get('http://localhost:19104/' , function(error, response, body){
          body.should.match(/Cozy Light: Your Personal Cloud at Home/);
          response.statusCode.should.eql(200);
          cozyProcess.kill('SIGINT');
      });
    },2000);
  });
  it('can remove app', function(done){
    var cmd = [
      'cozy-light',
      'uninstall',
      'cozy-dashboard',
      '--home',
      workingDir
    ];
    open_process(cmd, function(output, stdout, stderr, code){
      output.should.match(/successfully uninstalled/);
      stderr.should.eql('');
      code.should.eql(0);
      done();
    });
  });
  it('can remove plugin', function(done){
    var cmd = [
      'cozy-light',
      'remove-plugin',
      'cozy-homepage',
      '--home',
      workingDir
    ];
    open_process(cmd, function(output, stdout, stderr, code){
      output.should.match(/successfully uninstalled/);
      stderr.should.eql('');
      code.should.eql(0);
      done();
    });
  });
});
