var fs = require('fs');
var path_module = require('path');
var module_holder = [];
var modulesLoaded = false;
var modulesSorted = false;

function LoadModules(path) {
  fs.lstat(path, function (err, stat) {
    if (stat.isDirectory()) {
      // we have a directory: do a tree walk
      fs.readdir(path, function (err, files) {
        var f, l = files.length;
        for (var i = 0; i < l; i++) {
          f = path_module.join(path, files[i]);
          LoadModules(f);
        }
      });
    } else {
      // we have a file: load it
      console.log('Loading handler: ' + path);
      module_holder.push(require('../' + path));
    }
  });
}

// Loads all handlers
exports.loadModules = function () {
  var DIR = path_module.join('domain/handlers');
  LoadModules(DIR);
  modulesLoaded = true;
};

exports.handle = function (event, value) {
  if (!modulesSorted) {
    module_holder = module_holder.sort(function (a, b) {
      return a.order - b.order;
    });

    modulesSorted = true;
  }

  var i = 0;
  var cb = function () {
    var handler = module_holder[i];

    i++;
    if (!handler) {
      console.log('All handlers complete');
    }
    else if (typeof (handler.handle) === 'function') {
      handler.handle(event, value, cb);
    }
    else {
      cb();
    }
  };

  cb();
};
