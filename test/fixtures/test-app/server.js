var express = require('express');

var application = function(options, callback){
  if (options == null) {
    options = {};
  }
  options.name = 'test-app';
  options.root = options.root || __dirname;
  options.port = options.port || process.env.PORT;

  var app = express();
  app.get('/', function(req, res, next) {
    res.status(200).send({ok: true});
  });
  var server = app.listen(options.port, function (err) {
    if (callback) callback(err, app, server);
  });
};
module.exports = {
  start: application
};

if (!module.parent) {
  application();
}
