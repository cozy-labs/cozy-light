var express = require('express');

var application = function(options) {
  var app = express();
  app.get('/', function(req, res, next) {
    res.status(200).send({ok: true});
  });
  return app;
};

exports = module.exports = application;