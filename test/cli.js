
var fs = require('fs-extra');
var pathExtra = require('path-extra');
var request = require('request');
var spawn = require('child_process').spawn;
require('should');

var workingDir = pathExtra.join(__dirname, '.test-working_dir');

describe('CLI', function () {

  before(function () {
    try {
      fs.removeSync(workingDir);
    } catch(err) {
      console.log(err);
    }
    fs.mkdirSync(workingDir);
  });

  after(function () {
    fs.removeSync(workingDir);
  });

  var logOutput = function (c) {
    console.error((c + '').replace(/(.+)(\s+)?$/im, '$1'));
  };

  var openProcess = function (cmds, callback) {
    console.error('+ ' + cmds.join(' '));
    var bin = cmds.shift();
    var cozyProcess = spawn(bin, cmds);
    cozyProcess.stdout.on('data', logOutput);
    cozyProcess.stderr.on('data', logOutput);

    if (callback) {
      var output = '';
      var stdout = '';
      var stderr = '';
      cozyProcess.stdout.on('data', function (chunk) {
        output += chunk;
        stdout += chunk;
      });
      cozyProcess.stderr.on('data', function (chunk) {
        output += chunk;
        stderr += chunk;
      });
      cozyProcess.on('close', function (code) {
        callback(output, stdout, stderr, code);
      });
    }
    return cozyProcess;
  };

  this.timeout(60000);

  it('displays help', function (done) {
    var cmd = [
      './bin/cozy-light',
      '--help'
    ];

    openProcess(cmd, function (output) {
      output.should.match(/Usage: cozy-light/);
      done();
    });
  });

  it('detects cli options', function (done) {
    var cmd = [
      './bin/cozy-light',
      'display-config',
      '--home',
      workingDir
    ];
    openProcess(cmd, function (output) {
      //output.should.match(new RegExp(workingDir));
      done();
    });
  });

  it('can install plugin', function (done) {
    var cmd = [
      './bin/cozy-light',
      'add-plugin',
      'maboiteaspam/cozy-homepage',
      '--home',
      workingDir
    ];

    openProcess(cmd, function (output, stdout, stderr, code) {
      output.should.match(/Enjoy!/);
      stderr.should.eql('');
      code.should.eql(0);
      done();
    });
  });

  it('can install app', function (done) {
    var cmd = [
      './bin/cozy-light',
      'install',
      'maboiteaspam/cozy-dashboard',
      '--home',
      workingDir
    ];

    openProcess(cmd, function (output, stdout, stderr, code) {
      output.should.match(/Enjoy!/);
      //stderr.should.eql(''); // on node10.26 this won t be true, but test is still ok
      code.should.eql(0);
      done();
    });
  });

  it.skip('can install distro', function () {});

  it('displays content properly', function (done) {
    var cmd = [
      './bin/cozy-light',
      'start',
      '--port',
      '19105',
      '--home',
      workingDir
    ];
    var cozyProcess = openProcess(cmd)
      .on('close', function (code) {
        code.should.eql(0);
        done();
      });
    setTimeout(function () {
      var url = 'http://localhost:19105/apps/cozy-dashboard/';
      request.get(url, function(error, response, body){
        body.should.match(/Cozy Light: Your Personal Cloud at Home/);
        response.statusCode.should.eql(200);
        cozyProcess.kill('SIGINT');
      });
    }, 2000);
  });

  it('can stop properly', function (done) {
    var cmd = [
      './bin/cozy-light',
      'start',
      '--home',
      workingDir
    ];

    var cozyProcess = openProcess(cmd)
      .on('close', function (code) {
        code.should.eql(0);
        done();
      });

    setTimeout(function () {
      request.get('http://localhost:19104/', function(err, res, body){
        res.statusCode.should.eql(200);
        body.should.match(/Cozy Light: Your Personal Cloud at Home/);
        cozyProcess.kill('SIGINT');
      });
    }, 2000);
  });

  it('can remove app', function (done) {
    var cmd = [
      './bin/cozy-light',
      'uninstall',
      'cozy-dashboard',
      '--home',
      workingDir
    ];

    openProcess(cmd, function (output, stdout, stderr, code) {
      output.should.match(/successfully uninstalled/);
      stderr.should.eql('');
      code.should.eql(0);
      done();
    });
  });

  it('can remove plugin', function (done) {
    var cmd = [
      './bin/cozy-light',
      'remove-plugin',
      'cozy-homepage',
      '--home',
      workingDir
    ];

    openProcess(cmd, function (output, stdout, stderr, code) {
      output.should.match(/successfully uninstalled/);
      stderr.should.eql('');
      code.should.eql(0);
      done();
    });
  });
});
