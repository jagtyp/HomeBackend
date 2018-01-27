var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;
var uuid = require('node-uuid');
var storage = require('../storage');
var moment = require('moment');
moment().format();
var mongoUrl = 'mongodb://192.168.2.25/home';

exports.order = 2;

exports.handle = function(event, value, callback){
  console.log('trendHandler called');
// get from time from event.time Same on average
  var events = storage.getCachedEvents(event.sensorId, moment.utc().add(-5, 'minutes'));

  if(events.length === 0){
    callback();
    return;
  }

  var values = {
    first: events[0].median,
    last : event.median
  };

  var trend = values.first === values.last
  ? 0
  : (values.first > values.last ? -1 : 1) ;

  value.trend = trend;
  value.trendDifference = values.last - values.first;

  mongoClient.connect(mongoUrl, function(err, db) {
    if(err){
      console.log('Failed to connect to db');
      console.log(err);
      return;
    }

    db.collection('values').updateOne(
      {_id : value._id},
      {
        $set : {
          trend : trend,
          trendDifference : value.trendDifference
        }
      },
      { upsert : true },
      function(err, result){
        if(err){
          console.log('Failed to save value.');
          console.log(err);
        }

        db.close();
        callback();
      });
    });
  };
