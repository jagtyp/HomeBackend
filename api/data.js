/**
* David - 2016-03-07
**/
var config = require('../config');
var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;
var storage = require('../domain/storage');
var moment = require('moment');
moment().format();
var mongoUrl = config.credentials.mongoUrl;
var dbName = config.credentials.databaseName;
var eventsHandlers = require('../domain/eventHandlers');

// Receives a POST with data and saves the events
exports.post = function (req, res) {
    var startTime = new Date();
    //  logReq(req);
    var events = createEvents(req);

    if (events.length === 0) {
        res.status(400).send('Bad request - No events found');
        return;
    }

    // Save events to db
    storage.saveEvents(events, function (result) {
        if (!result) {
            res.status(500).send('Internal server error - Failed to save events');
            return;
        }

        for (var i = 0; i < events.length; i++) {
            handleSavedEvent(events[i]);
        }

        res.set('x-process-time', new Date() - startTime);
        res.json({ "success": "true" });
    });
}

// Executes a GET, returns the events
exports.get = function (req, res) {
    var startTime = new Date();
    // logReq(req);
    var sensors = [];
    var since = /*moment('2018-03-02 00:00');*/ moment().add(-1.5, 'hours');
    var until = /*moment('2018-03-02 01:00');*/ moment().add(5, 'minutes');
    //var until = moment().add(-3, 'hours');


    if (req.query) {
        var q = req.query;

        console.log('q');
        console.log(q);

        if (q.since) { since = moment(q.since); }
        if (q.until) { until = moment(q.until); }
        if (q.sensors && Array.isArray(q.sensors)) {
            sensors = q.sensors;
        }
    }

    mongoClient.connect(mongoUrl, function (err, client) {
        if (err) {
            console.log('Failed to connect to db');
            console.log(err);
            return;
        }
        var dbConn = new Date() - startTime;

        var query = {
            'time': {
                $gte: since.toDate(),
                $lte: until.toDate()
            }
        };

        if (sensors.length > 0) {
            query.sensorId = { $in: sensors };
        }

        console.log('Mongo query');
        console.log(query);

        client.db(dbName).collection('values').find(query).sort({ sensorId: 1, time: -1 }).limit(9999).toArray(function (err, values) {
            if (err) {
                console.log('Failed to fetch items');
                console.log(err);
            }

            var dbTime = new Date() - startTime;
            res.set('Server-Timing', 'miss, dbConn;dur=' + dbConn + ', db;dur=' + dbTime + '')
            res.set('x-process-time', dbTime);
            res.json(values);

            client.close();
        });
    });
}

// query: sensorId={sensor}&part={part from value}
exports.getLatest = function (req, res) {
    var startTime = new Date();
    var error = '';

    //  logReq(req);

    if (!req.query) {
        error = 'no sensor id is set (?sensorId=xx).';
    }
    else {
        var q = req.query;

        if (!q.sensorId) {
            error = 'no sensor id is set (?sensorId=xx).';
        }
        else {
            mongoClient.connect(mongoUrl, function (err, client) {
                if (err) {
                    console.log('Failed to connect to db');
                    console.log(err);
                    error = 'Failed to connect to database: ' + err;
                    return;
                }

                var dbConn = new Date() - startTime;

                var query = {
                    'sensorId': q.sensorId
                };

                client.db(dbName).collection('values').find(query).sort({ time: -1 }).limit(1).toArray(function (err, values) {
                    if (err) {
                        console.log('Failed to fetch latest value');
                        console.log(err);
                    }
                    else {
                        var dbTime = new Date() - startTime;
                        res.set('Server-Timing', 'miss, dbConn;dur=' + dbConn + ', db;dur=' + dbTime + '')
                        res.set('x-process-time', dbTime);
                        if (values.length) {
                            if (q.part) {
                                res.send('' + values[0][q.part]);
                            }
                            else {
                                res.send(values[0]);
                            }
                        }
                        else {
                            res.send('noData');
                        }
                    }

                    client.close();
                });
            });
        }
    }

    if (error) {
        res.set('x-process-time', new Date() - startTime);
        res.send('err : ' + error);
    }

    return;
}

// Gets the number of watts from the last hour
exports.getWatt = function (req, res) {
    try {
        mongoClient.connect(mongoUrl,
            function (err, client) {
                if (err) {
                    console.log('Failed to connect to db');
                    console.log(err);
                    error = 'Failed to connect to database: ' + err;
                    return;
                }
                //  db.getCollection("realtimeMeasurements_6860d51a-5474-472d-ae63-9773d2857f13").find({}, {AccumulatedConsumption : 1}).sort({$natural :-1}).limit(1)

                client.db(dbName).collection('realtimeMeasurements_6860d51a-5474-472d-ae63-9773d2857f13')
                    .find({}).sort({ $natural: -1 }).limit(1)
                    .toArray(
                        function (err, values) {
                            if (err) {
                                console.log('Failed to fetch latest value');
                                console.log(err);
                            } else {
                                if (values.length === 0) {
                                    res.send('' + 0);
                                } else {
                                    res.send('' + values[0].AccumulatedConsumption);
                                }
                            }

                            client.close();
                        });

                // var since = moment().add(-1, 'hours');
                // var until = moment().add(5, 'minutes');

                // var query = {
                //     sensorId: 'energy/watts',
                //     time: { $gt: since.toDate(), $lt: until.toDate() }
                // }

                // client.db(dbName).collection('values').aggregate([
                //     { $match: query },
                //     { $sort: { "time": -1 } },
                //     { $group: { _id: null, total: { $sum: "$value" } } }
                // ]).toArray(
                //     function (err, values) {
                //         if (err) {
                //             console.log('Failed to fetch latest value');
                //             console.log(err);
                //         } else {
                //             if (values.length === 0) {
                //                 res.send('' + 0);
                //             } else {
                //                 res.send('' + values[0].total);
                //             }
                //         }

                //         client.close();
                //     });
            });
    }
    catch (e) { }
}

// Gets watts over time per minute
exports.getWattPerMinute = function (req, res) {
    try {
        mongoClient.connect(mongoUrl,
            function (err, client) {
                if (err) {
                    console.log('Failed to connect to db');
                    console.log(err);
                    error = 'Failed to connect to database: ' + err;
                    return;
                }

                var since = moment().add(-1, 'hours');
                var until = moment().add(5, 'minutes');

                var query = {
                    sensorId: 'energy/watts',
                    time: { $gt: since.toDate(), $lt: until.toDate() }
                }

                client.db(dbName).collection('values').aggregate([
                    {
                        $match: query
                    },
                    {
                        $project: {
                            time: { $dateToString: { format: "%Y-%m-%d %H:%M", date: "$time" } },
                            value: "$value"
                        }
                    },
                    { $group: { _id: "$time", value: { $sum: "$value" } } },
                    { $sort: { _id: -1 } }
                ]).toArray(
                    function (err, values) {
                        if (err) {
                            console.log('Failed to fetch latest value');
                            console.log(err);
                        } else {
                            res.send(JSON.stringify(values));
                        }

                        client.close();
                    });
            });
    }
    catch (e) { }
}

// Gets watts over time per hour
exports.getWattPerHour = function (req, res) {
    try {
        mongoClient.connect(mongoUrl,
            function (err, client) {
                if (err) {
                    console.log('Failed to connect to db');
                    console.log(err);
                    error = 'Failed to connect to database: ' + err;
                    return;
                }

                var since = moment().add(-1, 'days');
                var until = moment().add(5, 'minutes');

                var query = {
                    sensorId: 'energy/watts',
                    time: { $gt: since.toDate(), $lt: until.toDate() }
                }

                client.db(dbName).collection('values').aggregate([
                    {
                        $match: query
                    },
                    {
                        $project: {
                            time: { $dateToString: { format: "%Y-%m-%d %H", date: "$time" } },
                            value: "$value"
                        }
                    },
                    { $group: { _id: "$time", value: { $sum: "$value" } } },
                    { $sort: { _id: -1 } }
                ]).toArray(
                    function (err, values) {
                        if (err) {
                            console.log('Failed to fetch latest value');
                            console.log(err);
                        } else {
                            res.send(JSON.stringify(values));
                        }

                        client.close();
                    });
            });
    }
    catch (e) { }
}

// Gets watts over time per day
exports.getWattPerDay = function (req, res) {
    try {
        mongoClient.connect(mongoUrl,
            function (err, client) {
                if (err) {
                    console.log('Failed to connect to db');
                    console.log(err);
                    error = 'Failed to connect to database: ' + err;
                    return;
                }

                client.db(dbName).collection('realtimeMeasurements_6860d51a-5474-472d-ae63-9773d2857f13').aggregate([
                    // {
                    //     // TODO: Add time    
                    //     $match: query
                    // },
                    {
                        $group: {
                            _id: { $dateToString: { date: { $toDate: "$_id" }, format: '%Y-%m-%d' } },
                            value: { $max: "$AccumulatedConsumption" }
                        }
                    }, {
                        $sort: { _id: 1 }
                    }
                ]).toArray(
                    function (err, values) {
                        if (err) {
                            console.log('Failed to fetch latest value');
                            console.log(err);
                        } else {
                            let date = moment(values[0]._id);
                            const vals = [];
                            for (let i = 0; i < values.length; i++) {
                                const val = values[i];
                                const currDate = moment(val._id);

                                // Will add days with empty value when the days are missing
                                while (date < currDate) {
                                    vals.push({ _id: date.format('YYYY-MM-DD'), value: 0 });
                                    date = date.add(1, 'day');
                                }

                                vals.push({ _id: val._id, value: parseFloat(val.value) })
                                date = date.add(1, 'day');
                            }

                            res.send(JSON.stringify(vals));
                        }

                        client.close();
                    });
            });
    }
    catch (e) { }
}

// Gets watts over time per day
exports.getWattPerDay_old = function (req, res) {
    try {
        mongoClient.connect(mongoUrl,
            function (err, client) {
                if (err) {
                    console.log('Failed to connect to db');
                    console.log(err);
                    error = 'Failed to connect to database: ' + err;
                    return;
                }

                var since = moment().add(-7, 'days');
                var until = moment().add(5, 'minutes');

                var query = {
                    sensorId: 'energy/watts',
                    time: { $gt: since.toDate(), $lt: until.toDate() }
                }

                client.db(dbName).collection('values').aggregate([
                    {
                        $match: query
                    },
                    {
                        $project: {
                            time: { $dateToString: { format: "%Y-%m-%d", date: "$time" } },
                            value: "$value"
                        }
                    },
                    { $group: { _id: "$time", value: { $sum: "$value" } } },
                    { $sort: { _id: -1 } }
                ]).toArray(
                    function (err, values) {
                        if (err) {
                            console.log('Failed to fetch latest value');
                            console.log(err);
                        } else {
                            res.send(JSON.stringify(values));
                        }

                        client.close();
                    });
            });
    }
    catch (e) { }
}

function createEvents(req) {
    var events = [];

    if (req.body) {
        var body = req.body;
        var fromJson = function (json) {
            return {
                "sensorId": json.sensorId,
                "value": json.value,
                "time": json.time || new Date().getTime() / 1000,
                "regTime": new Date()
            }
        };
        if (Array.isArray(body)) {
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

function handleSavedEvent(event) {
    var value = {
        _id: event._id,
        sensorId: event.sensorId,
        value: event.value,
        time: new Date(event.time * 1000) // TODO: make sure this works event when milliseconds are included
    };

    storage.saveValue(value, function (saved) {
        eventsHandlers.handle(event, value);
    });
}

function logReq(req) {
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
