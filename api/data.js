/**
* David - 2016-03-07
**/
var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;
var storage = require('../domain/storage');
var moment = require('moment');
moment().format();
var mongoUrl = 'mongodb://192.168.2.25/home';
var eventsHandlers = require('../domain/eventHandlers');

// Receives a POST with data and saves the events
exports.post = function(req, res){
  var startTime = new Date();
//  logReq(req);
  var events = createEvents(req);

  if(events.length === 0){
    res.status(400).send('Bad request - No events found');
    return;
  }

  // Save events to db
  storage.saveEvents(events, function(result){
    if(!result) {
      res.status(500).send('Internal server error - Failed to save events');
      return;
    }

    for (var i = 0; i < events.length; i++) {
      handleSavedEvent(events[i]);
    }

    res.set('x-process-time', new Date() - startTime);
    res.json({"success":"true"});
  });
}

// Executes a GET, returns the events
exports.get = function(req, res){
  var startTime = new Date();
  logReq(req);
  var sensors = [];
  var since = moment().add(-1.5, 'hours');
  var until = moment().add(5, 'minutes');
  //var until = moment().add(-3, 'hours');


  if(req.query){
    var q = req.query;

console.log('q');
console.log(q);

    if(q.since){ since = moment(q.since); }
    if(q.until){ until = moment(q.until); }
    if(q.sensors && Array.isArray(q.sensors)){
      sensors = q.sensors;
    }
  }

  mongoClient.connect(mongoUrl, function(err, db) {
    if(err){
      console.log('Failed to connect to db');
      console.log(err);
      return;
    }

    var query = {
      'time' : {
        $gte : since.toDate(),
        $lte : until.toDate()
      }
    };

    if(sensors.length > 0){
      query.sensorId = { $in : sensors };
    }

    console.log('Mongo query');
    console.log(query);

    db.collection('values').find(query).sort({ sensorId : 1, time : -1}).limit(9999).toArray(function(err, values){
      if(err){
        console.log('Failed to fetch items');
        console.log(err);
      }

      res.set('x-process-time', new Date() - startTime);
      res.json(values);

      db.close();
    });
  });
}

// query: sensorId={sensor}&part={part from value}
exports.getLatest = function(req, res){
  var startTime = new Date();
  var error = '';

  logReq(req);

  if(!req.query){
    error = 'no sensor id is set (?sensorId=xx).';
  }
  else {
    var q = req.query;

    if(!q.sensorId){
      error = 'no sensor id is set (?sensorId=xx).';
    }
    else{
      mongoClient.connect(mongoUrl, function(err, db) {
        if(err){
          console.log('Failed to connect to db');
          console.log(err);
          error = 'Failed to connect to database: ' + err;
          return;
        }

        var query = {
          'sensorId' : q.sensorId
        };

        db.collection('values').find(query).sort({time : -1}).limit(1).toArray(function(err, values){
          if(err){
            console.log('Failed to fetch latest value');
            console.log(err);
          }
          else{
            res.set('x-process-time', new Date() - startTime);
            if(values.length){
              if(q.part){
                res.send('' + values[0][q.part]);
              }
              else{
                res.send(values[0]);
              }
            }
            else{
              res.send('noData');
            }
          }

          db.close();
        });
      });
    }
  }

  if(error){
    res.set('x-process-time', new Date() - startTime);
    res.send('err : ' + error);
  }

  return;
}

function createEvents(req){
  var events = [];

  if(req.body){
    var body = req.body;
    var fromJson = function(json){return {
      "sensorId" : json.sensorId,
      "value" : json.value,
      "time" : json.time,
      "regTime" : new Date()
    }};
    if(Array.isArray(body)){
      for (var i = 0; i < body.length; i++) {
        var evt = body[i];
        events.push(fromJson(evt));
      }
    }
    else {
      events.push(fromJson(body));
    }
  }

  // TODO: Add other formats than json


  /*
  new Reading
  {
  SensorId = sensorId,
  Value = value,
  RegTime = regTime,
  Time = time
}
*/

  return events;
}

function handleSavedEvent(event){
  var value = {
    _id : event._id,
    sensorId : event.sensorId,
    value : event.value,
    time : new Date(event.time * 1000) // TODO: make sure this works event when milliseconds are included
  };

  storage.saveValue(value, function(saved){
    eventsHandlers.handle(event, value);
  });
}

function logReq(req){
  console.log('Headers: ');
  console.log(req.headers);

  console.log('Parameters: ');
  console.log(req.params);

  console.log('Body: ');
  console.log(req.body);

  console.log('Querystring: ');
  console.log(req.query);
}


/*
  To add value with postman:
  Post to:  http://localhost:3001/data
  Header:   Content-Type : application/json
  Body:     {
              "sensorId" : "s1",
              "value" : {{$randomInt}},
              "time" : {{$timestamp}}
            }

  To get values:
  Get url: http://localhost:3001/data?since=2016-08-03T18:13Z&until=2016-08-03T18:15Z&sensors[]=s1&sensors[]=s2
*/
