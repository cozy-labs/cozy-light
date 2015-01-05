var _ = require('underscore');
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
var symbols = require('symbolsjs');
var nodeHelpers = require('./node-helpers');

// Constants
const LOGGER = printit({ prefix: 'Cozy Light' });
const DEFAULT_PORT = 19104;

// 'Global' variables

var program = {};
var configPath = '';
var loadedApps = {};
var port = 18001;
var defaultAppsPort = port;
var config = null;
var server = null;
var db = null;
var expressLog = false;

var cozyLight = {
  status: 'stopped',
  init: function( program ){
    cozyLight.status = 'started';
    cozyLight.npmHelpers.initialWd = process.cwd();
    cozyLight.configHelpers.init(program.home);
    cozyLight.configHelpers.setMainAppPort(program.port || 19104);
    process.chdir(program.home);
    cozyLight.pluginHelpers.loadAll(program);
  },
  routes: {},
  configHelpers: {},
  npmHelpers: {},
  pluginHelpers: {},
  applicationHelpers: {},
  mainAppHelper: {},
  actions: {}
};

cozyLight.configHelpers = require('./config-helper')();

cozyLight.npmHelpers = require('./npm-helpers')(cozyLight);
cozyLight.pluginHelpers = require('./plugin-helpers')(cozyLight);
cozyLight.applicationHelpers = require('./application-helpers')(cozyLight);
cozyLight.mainAppHelper = require('./main-app-helper')(cozyLight);
cozyLight.actions = require('./actions')(cozyLight);

module.exports = cozyLight;
