
/**
 * GET /
 * Home page.
 */


var express = require('express');

// var dbus = require('dbus-native');
// var dbus = require('dbus');
var DBus = require('ndbus');

var IFACE = {
  BUS: 'org.openaps.oacids'
, IFACE: 'org.openaps.Service'
, Service: 'org.openaps.Service'
, PROPS: 'org.freedesktop.DBus.Properties'
, Introspectable: 'org.freedesktop.DBus.Introspectable'
, ObjectManager: 'org.freedesktop.DBus.ObjectManager'
};
IFACE.Instance = IFACE.Service + '.Instance';
IFACE.Alias = IFACE.Instance + '.Alias';
IFACE.Report = IFACE.Instance + '.Report';
IFACE.Device = IFACE.Instance + '.Device';
IFACE.Vendor = IFACE.Instance + '.Vendor';
IFACE.Extra = IFACE.Device + 'Extra';
var PATHS = {
  BASE: '/org/openaps/Services'
, Singleton: '/org/openaps/Services'
};
PATHS.Instance = PATHS.BASE + '/Instance';

function get_openaps_status (req, res, next) {
  /*
  req.app.locals.dbus.getInterface(IFACE.BUS, PATHS.Singleton, IFACE.IFACE, function (err, iface) {
  });
  */
  /*
  req.app.locals.dbus.getService(IFACE.BUS).getInterface(PATHS.Singleton, IFACE.PROPS, function (err, iface) {
  });
  */
  
  req.app.locals.dbus.proxy(IFACE.BUS, PATHS.Singleton, IFACE.PROPS, function (err, iface) {
    console.log(arguments);
    if (err) {
      return next(err);
    }
    iface.GetAll(IFACE.Service, function (err, props) {
      console.log("GETALL RESULTS", arguments);
      if (err) {
        return next(err);
      }
      res.dbus = {
        status: props
      }
      next( );
    });

  });
}

function param_PATH (req, res, next, path) {
  req.BUS = IFACE.BUS;
  var known = {
    'service': PATHS.Singleton
  , 'instance': PATHS.Instance
  };
  req.obj_path = known[path] || PATHS.Singleton;
  next( );
}

function param_IFACE (req, res, next, iface) {
  var known = {
    'objects': PATHS.Singleton
  , 'props': PATHS.Instance
  };
  req.obj_iface = IFACE[iface] || known[iface] || IFACE.Service;
  next( );
}

function select_dbus_method (opts) {
  function select_method (req, res, next) {
    if (opts && opts.method) {
      req.obj_method = opts.method;
    }
    next( );
  }
  return select_method
}


function get_selected_iface (req, res, next) {
  req.app.locals.dbus.proxy(req.BUS, req.obj_path, req.obj_iface, function (err, iface) {
    if (err) {
      return next(err);
    }
    req.iface = iface;
    next( );
  });

}


function props_for (iface) {
  function query_selected_props (req, res, next) {
    console.log(arguments);

    req.iface.GetAll(iface, function (err, props) {
      console.log("GETALL RESULTS", arguments);
      if (err) {
        return next(err);
      }
      res.dbus = {
        status: props
      }
      next( );
    });

  }
  return query_selected_props;
}

function cfg_iface_for (opts) {
  function get_iface (req, res, next) {
    req.app.locals.dbus.proxy(opts.BUS, opts.path, opts.iface, function (err, iface) {
      if (err) {
        return next(err);
      }
      req.iface = iface;
      if (opts.name) {
        req[name] = iface;
      }
      next( );
    });

  }
  return get_iface;
}

function enumerate_objects (req, res, next) {
  req.iface.GetManagedObjects(function (err, tree) {
    console.log("MANAGED OBJECTED", arguments);
    if (err) { return next(err); }
    res.dbus = tree
    next( );
  });
}


function fmt_dbus_results (req, res, next) {
  if (res.dbus) {
    return res.json(res.dbus);
  }
  return next("unknown results!");
}
exports.routes = function (master) {
  // master
  var app = express( );

  // app.locals.dbus = dbus.sessionBus( );
  app.locals.dbus = DBus( );

  // app.param('path', param_PATH);
  // app.param('iface', param_IFACE);
  app.get('/service', cfg_iface_for({BUS: IFACE.BUS, path: PATHS.Singleton, iface: IFACE.PROPS }), props_for(IFACE.Service), fmt_dbus_results);
  app.get('/service/objects', cfg_iface_for({BUS: IFACE.BUS, path: PATHS.Singleton, iface: IFACE.ObjectManager }), enumerate_objects, fmt_dbus_results);
  app.get('/instance', cfg_iface_for({BUS: IFACE.BUS, path: PATHS.Instance, iface: IFACE.PROPS }), props_for(IFACE.Instance), fmt_dbus_results);
  app.get('/instance/objects', cfg_iface_for({BUS: IFACE.BUS, path: PATHS.Instance, iface: IFACE.ObjectManager }), enumerate_objects, fmt_dbus_results);
  app.get('/status', get_openaps_status, fmt_dbus_results);
  // app.get('/initialize', fmt_wizard);

  return app;
}
