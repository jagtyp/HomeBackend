var config = require('../../config');
var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;
var uuid = require('node-uuid');
var storage = require('../storage');
var moment = require('moment');
moment().format();
var mongoUrl = config.credentials.mongoUrl;
var dbName = config.credentials.databaseName;

// There can be many with the same order, but they shouldn't depend on other
// handlers with the same order
exports.order = 1;

exports.handle = function(event, value, callback){
  console.log('averageHandler called');

  var events = storage.getCachedEvents(event.sensorId, moment.utc().add(-5, 'minutes')).reverse().slice(0,5);

  if(events.length === 0){
    callback();
    return;
  }

  var values = [];
  for (var i = 0; i < events.length; i++) {
    var evt =  events[i];
    values.push(evt.value);
  }

  var med = median(values);
  var avg = average(values);

  value.median = med;
  value.average = avg;

  event.median = med;
  event.average = avg;

  mongoClient.connect(mongoUrl, function(err, client) {
    if(err){
      console.log('Failed to connect to db');
      console.log(err);
      return;
    }

    var query = { _id : value._id };
    var update = {
      $set : {
        median : med,
        average : avg
      }
    };

    var executed = 0;

    var close = function(){
      executed++;
      if(executed === 2){
        try {
            client.close();
        } catch (e) {
          console.log('Failed to close db connection.');
          console.log(e);
        } finally {

        }
      }
    }
    // Sets values in events
    client.db(dbName).collection('events').updateOne(query, update,
      { upsert : true },
      function(err, result){
        if(err){
          console.log('Failed to save value.');
          console.log(err);
        }

        close();

        // Will continue execution of the next handler
        callback();
      });

    // Sets values in values
      client.db(dbName).collection('values').updateOne(query, update,
      { upsert : true },
      function(err, result){
        if(err){
          console.log('Failed to save value.');
          console.log(err);
        }

        close();
      });
    });
  }

  // https://gist.github.com/caseyjustus/1166258
  function median(values) {
    values.sort( function(a,b) {return a - b;} );
    var half = Math.floor(values.length/2);

    if(values.length % 2){
      return values[half];
    }
    else{
      return (values[half-1] + values[half]) / 2.0;
    }
  }

  function average(values){
    var sum = 0;
    for( var i = 0; i < values.length; i++ ){
      sum += parseInt( values[i], 10 ); //don't forget to add the base
    }

    return sum/values.length;
  }
