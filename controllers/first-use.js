
/**
 * GET /
 * Home page.
 */


var express = require('express');

exports.index = function(req, res) {
  res.render('first-use/index', {
    title: 'Home'
  });
};

function fmt_wizard (req, res) {
  res.json({wizard: req.openaps.wizard });
}

var wifiscanner = require('wifiscanner');
function list_networks (req, res, next) {
  var scanner = wifiscanner( );
  scanner.scan(function (err, results) {
    req.wifi = { status: err, networks: results };
    next( );
  });
}

function fmt_networks (req, res, next) {
  res.json(req.wifi);
}

function preview_claim (req, res, next) {
  var user = req.user;
  user.profile.name = req.body.name;
  next( );
}

function claim_device_name (req, res, next) {
  req.user.save(function(err) {
    if (err) {
      return next(err);
    }
    next( );
  });
}

function claim_openaps_init (req, res, next) {

  req.run_openaps_initialization({medtronic: req.body.medtronic_serial, dexcom: req.body.dexcom_serial }, function (err, stdout, stderr) {
    if (err) {
      res.status(406);
    }
    req.openaps.wizard.claiming = {err: err, stdout: stdout, stderr: stderr };
    next( );
  });
}

function fmt_claim (req, res, next) {
}

exports.routes = function (app) {
  var app = express( );
  app.get('/', exports.index);
  app.post('/initialize', preview_claim, claim_device_name, claim_openaps_init, fmt_wizard);
  app.post('/claim', preview_claim, claim_device_name, claim_openaps_init, fmt_wizard);
  app.get('/initialize', fmt_wizard);
  app.get('/networks/wifi', list_networks, fmt_networks);
  return app;
}
