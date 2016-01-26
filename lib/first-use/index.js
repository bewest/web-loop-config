
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;

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

function run_openaps_initialization (conf, cb) {
  console.log("INITIALIZING OPENAPS", conf, ctx);
  var init = path.resolve(__dirname, '../../bin/openaps-oref0-setup-loop.sh');
  var prog = [ init, conf.medtronic, conf.dexcom ].join(' ');
  console.log("PROG", prog);
  var startEnv = { OPENAPS_HOME : ctx.HOME, MEDTRONIC_TRANSPORT: 'subg_rfspy' };
  exec(prog, {env: startEnv }, function (err, stdout, stderr) {
    console.log(stderr);
    console.log(stdout);
    console.log("DONE", arguments);
    cb(err, stdout, stderr);
  });
}


function instance_configured ( ) {
  return home_exists( );
}

api.flag_openaps = function flag_openaps (req, res, next) {
  console.log("USER?", req.user);
  req.run_openaps_initialization = run_openaps_initialization;
  req.openaps = { };
  req.openaps.configured = false;
  if (instance_configured( )) {
    req.openaps.configured = true;
  } else {
    var wizard = {
      user: req.user
    , home: home_exists( )
    };
    req.openaps.wizard = wizard;
  }
  next( );
}

api.redirect_unconfigured = function redirect_unconfigured (req, res, next) {
  console.log(req.url);
  console.log(req.path);
  if (!req.openaps.configured) {
    if (req.path.indexOf('/first-use/') !== 0 &&
        req.path.indexOf('/signup') !== 0) {
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

