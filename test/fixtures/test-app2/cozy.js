var express = require('express');
var application = require(__dirname+'/application.js');

var cozyHandler = {
  start:function(options, callback) {
    if (options == null) {
      options = {};
    }
    options.name = 'test-app2';
    options.root = options.root || __dirname;
    options.port = options.port || process.env.PORT;

    var app = application(options);
    var server = app.listen(options.port, function (err) {
      callback(err, app, server);
    });
  }
};

exports = module.exports = cozyHandler;
