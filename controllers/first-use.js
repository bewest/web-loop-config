
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

function initOpenAPS (req, res) {
  res.json(req.openaps.wizard);
}

exports.routes = function (app) {
  var app = express( );
  app.get('/', exports.index);
  app.post('/initialize', initOpenAPS);
  app.get('/initialize', initOpenAPS);
  return app;
}
