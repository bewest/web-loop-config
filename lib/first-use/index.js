
var path = require('path');
var fs = require('fs');

var ctx = null;
function api ( ) {
  if (!ctx) {
    ctx = { BASE: process.env.OPENAPS_BASE };
    ctx.HOME = process.env.OPENAPS_HOME || path.resolve(ctx.BASE, './openaps');
  }
  // console.log('ENV', process.env);
  return ctx;
}

function home_exists ( ) {
  console.log('ctx', ctx);
  if (fs.existsSync(ctx.BASE)) {
    if (fs.existsSync(path.resolve(ctx.HOME, './.git'))) {
      return true;
    }
  }
  return false;
}

function instance_configured ( ) {
  return home_exists( );
}

api.flag_openaps = function flag_openaps (req, res, next) {
  req.openaps = { };
  req.openaps.configured = false;
  if (instance_configured( )) {
    req.openaps.configured = true;
  } else {
    var wizard = {
      home: home_exists( )
    };
    req.openaps.wizard = wizard;
  }
  next( );
}

api.redirect_unconfigured = function redirect_unconfigured (req, res, next) {
  console.log(req.url);
  console.log(req.path);
  if (!req.openaps.configured) {
    if (req.path.indexOf('/first-use/') !== 0 ||
        req.path.indexOf('/account/signup') !== 0) {
      res.redirect('/first-use/');
      return;
    }
  }
  if (req.path.indexOf('/first-use/') === 0) {
    res.redirect('/');
    return;
  }
  next( );
}

exports = module.exports = api;

