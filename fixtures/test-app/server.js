var express = require('express');

var application = module.exports.start = function(options, callback) {
  if (options == null) {
    options = {};
  }
  options.name = 'test';
  options.root = options.root || __dirname;
  options.port = options.port || process.env.PORT;

  if (options.db !== null) {
    var app = express();
    app.get('/', function(req, res, next) {
      res.status(200).send({ok: true});
    });
    var server = app.listen(options.port, function (err) {
      callback(err, app, server);
    });
  };
};

if (!module.parent) {
  application();
}
