var _ = require('underscore');
var http = require('http');
var https = require('https');
var fs = require('fs');
var fsExtra = require('fs-extra');
var pathExtra = require('path-extra');
var npm = require('npm');
var request = require('request-json-light');
var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var async = require('async');
var printit = require('printit');
var httpProxy = require('http-proxy');
var symbols = require('symbolsjs');
var distrib = require('./distrib');
var configWatcher = require('./config-watcher');
var nodeHelpers = require('./node-helpers');

// Constants
const LOGGER = printit({ prefix: 'Cozy Light' });
const DEFAULT_PORT = 19104;

// 'Global' variables

var program = {};
var configPath = '';
var loadedApps = {};
var loadedPlugins = {};
var port = 18001;
var defaultAppsPort = port;
var config = null;
var server = null;
var db = null;
var expressLog = false;

var routes = {};

var configHelpers = require('./config-helper')();

var npmHelpers = require('./npm-helpers')(configHelpers);
var pluginHelpers = require('./plugin-helpers')(configHelpers, routes);
var applicationHelpers = require('./application-helpers')(configHelpers, routes);
var mainAppHelper = require('./main-app-helper')(configHelpers, routes);
var actions = require('./actions')(configHelpers,
  routes,
  pluginHelpers,
  mainAppHelper,
  applicationHelpers,
  distrib,
  configWatcher,
  npmHelpers,
  program);

module.exports = {
  configHelpers:configHelpers,
  npmHelpers:npmHelpers,
  pluginHelpers:pluginHelpers,
  applicationHelpers:applicationHelpers,
  mainAppHelper:mainAppHelper,
  actions:actions
};
