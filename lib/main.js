var fs = require('fs-extra');
var http = require('http');
var https = require('https');
var httpProxy = require('http-proxy');
var async = require('async');

var nodeHelpers = require('./helpers/node');
var logger = require('./helpers/logger');
var configHelpers = require('./config');
var routes = require('./routes');

var proxy;
var server;


var controllers = {

  /**
   * Proxy requests targeting apps.
   */
  proxyPrivate: function (req, res) {
    var appName = req.params.name;
    var appPort = routes[appName];
    req.url = req.url.substring(('/apps/' + appName).length);
    if (appPort !== null) {
      proxy.web(req, res, { target: 'http://localhost:' + appPort });
    } else {
      res.send(404);
    }
  },

  /**
   * Proxy requests targeting apps public path.
   */
  proxyPublic: function (req, res) {
    var appName = req.params.name;
    var appPort = routes[appName];
    req.url = '/public' + req.url.substring(('/public/' + appName).length);
    if (appPort !== null) {
      proxy.web(req, res, { target: 'http://localhost:' + appPort });
    } else {
      res.send(404);
    }
  }

};


module.exports = mainAppHelpers =  {

  /**
   * Returns the proxy responsible to forward
   * requests made from /app/* to the targeted app server
   *
   * @return Object Proxy of the main app.
   */
  getProxy: function () {
    return proxy;
  },

  /**
   * Configure properly proxy: handle errors and websockets.
   *
   */
  initializeProxy: function () {

    proxy = httpProxy.createProxyServer(/*{agent: new http.Agent()}*/);

    proxy.on('error', function onProxyError(err, req, res) {
      logger.raw(err);
      res.status(500).send(err);
    });

    server.on('upgrade', function onProxyUpgrade(req, socket, head) {

      function proxyWS(port) {
        proxy.ws(req, socket, head, {
          target: 'ws://localhost:' + port,
          ws: true
        });
      }

      req.originalUrl = req.url;

      var publicOrPrivate = '';
      var slug = '';

      var urlParts = req.url.split('/');
      if (urlParts.length >= 3) {
        publicOrPrivate = urlParts[1];
        slug = urlParts[2];
      }

      if (publicOrPrivate === 'public') {
        req.url = req.url.replace('/public/' + slug, '/public');
        proxyWS(routes[slug]);

      } else if (publicOrPrivate === 'apps') {
        req.url = req.url.replace('/apps/' + slug, '');
        proxyWS(routes[slug]);

      } else {
        proxyWS(process.env.DEFAULT_REDIRECT_PORT);
      }
    });

    return proxy;
  },

  /**
   * Configure main application server.
   *
   * @param app
   * @returns {*}
   */
  start: function (app) {
    var config = configHelpers.getConfig();

    // Set SSL configuration if certificates path are properly set.
    var options = {};
    if (config.ssl !== undefined) {
      options.key = fs.readFileSync(config.ssl.key, 'utf8');
      options.cert = fs.readFileSync(config.ssl.cert, 'utf8');
      server = https.createServer(options, app);
    } else  {
      server = http.createServer(app);
    }

    var mainPort = configHelpers.getMainAppPort();
    server.listen(mainPort);
    mainAppHelpers.initializeProxy();

    logger.info(
      'Cozy Light server is listening on port ' + mainPort + '...'
    );

    app.all('/apps/:name/*', controllers.proxyPrivate);
    app.all('/apps/:name*', controllers.proxyPrivate);

    app.all('/public/:name/*', controllers.proxyPublic);
    app.all('/public/:name*', controllers.proxyPublic);

    return server;
  },

  /**
   * Stop main application server.
   */
  stop: function (done) {
    var list = [];
    logger.debug('Stop main server...');
    if (server) {
      list.push(function closeMainServer (callback) {
        try {
          logger.debug("Stop server...");
          server.close(function() {
            logger.debug("Server stopped.");
          });
          callback();
        } catch (err) {
          nodeHelpers.invoke(callback);
        }
      });
    }
    if (proxy) {
      list.push(function closeProxy (callback) {
        logger.debug("Stop proxy.");
        if (proxy.close !== undefined) {
          proxy.close(); // does not work well, or has no callback
        }
        logger.debug("Proxy stopped.");
        nodeHelpers.invoke(callback);
      });
    }
    async.series(list, function() {
      logger.debug('Main server stopped.');
      done();
    });
  }
};

