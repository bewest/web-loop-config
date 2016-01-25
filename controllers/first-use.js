
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

exports.routes = function (app) {
  var app = express( );
  app.get('/', exports.index);
  return app;
}
