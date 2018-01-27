var storage = require('../storage');
var moment = require('moment');
moment().format();

// There can be many with the same order, but they shouldn't depend on other
// handlers with the same order
exports.order = 10;

exports.handle = function(event, value, cb){
  console.log('Test handler called');
  cb();
}
