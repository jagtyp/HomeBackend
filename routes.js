/**
*
*/

var api = {}; // so that if apis grow just add like, api.inbox, api.share ..

api.data = require('./api/data');

exports.register = function(app){
  app.post('/data', function(req, res){
    api.data.post(req, res);
  });
  app.get('/data', function(req, res){
    api.data.get(req, res);
  });
  app.get('/data/latest', function(req, res){
    api.data.getLatest(req, res);
  });
};
