/**
* David - 2016-03-07
**/
var config = require('../config');
var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;
var uuid = require('node-uuid');
var moment = require('moment');
moment().format();
var mongoUrl = config.credentials.mongoUrl;
var dbName = config.credentials.databaseName;

var _cachedEvents = [];

exports.fillCache = function () {
    mongoClient.connect(mongoUrl, function (err, client) {
        if (err) {
            console.log('Failed to connect to db');
            console.log(err);
            return false;
        }

        var coll = client.db(dbName).collection('events');
        var query = { time: { $gte: moment.utc().add(-1, 'days').unix() } };

        coll.find(query).sort({ time: 1 }).toArray(function (err, events) {
            if (err) {
                console.log('Failed to fetch items');
                console.log(err);
            }

            if (events) {
                for (var i = 0; i < events.length; i++) {
                    _cachedEvents.push(events[i]);
                }
            }

            client.close();

            console.log('Filled cache with ' + _cachedEvents.length + ' events.');
            setInterval(function () {
                var timestamp = moment.utc().add(-1, 'days').unix();
                removeOldFromCache(timestamp);
            }, 60000);
        });
    });
}

// Gets events from the cache. If a dates are provided, events are returned
// between,otherwise all events are returned
exports.getCachedEvents = function (sensorId, since, until) {
    var sinceUnix, untilUnix;
    if (since) {
        sinceUnix = moment(since).unix();
        if (typeof (sinceUnix) !== 'number') {
            sinceUnix = null;
        }
    }
    if (until) {
        untilUnix = moment(until).unix();
        if (typeof (sinceUnix) !== 'number') {
            sinceUnix = null;
        }
    }

    return _cachedEvents.filter(function (el) {
        if (sinceUnix && el.time < sinceUnix) {
            return false;
        }

        if (untilUnix && el.time > untilUnix) {
            return false;
        }

        if (sensorId && el.sensorId !== sensorId) {
            return false;
        }

        return true;
    });
}

exports.saveEvents = function (events, callback) {
    mongoClient.connect(mongoUrl, function (err, client) {
        if (err) {
            console.log('Failed to connect to db');
            console.log(err);
            return false;
        }

        for (var i = 0; i < events.length; i++) {
            var evt = events[i];
            if (evt['_id'] === undefined) {
                var my_uuid = uuid.v4(null, new Buffer(16));
                evt['_id'] = mongodb.Binary(my_uuid, mongodb.Binary.SUBTYPE_UUID);
            }

            _cachedEvents.push(evt);
        }
        var coll = client.db(dbName).collection('events');
        coll.insertMany(events, function (err, result) {
            client.close();
            if (err) {
                console.log('Failed to insert events.');
                console.log(err);
                callback(false);
                return;
            }

            if (result.insertedCount !== events.length) {
                console.log('Some events arent inserted: ' + result.insertedCount + '/' + events.length);
                callback(false);
                return;
            }

            callback(true);
        });
    });
}

exports.saveValue = function (value, callback) {
    mongoClient.connect(mongoUrl, function (err, client) {
        if (err) {
            console.log('Failed to connect to db');
            console.log(err);
            return false;
        }

        var coll = client.db(dbName).collection('values');
        coll.update({ _id: value._id }, value, { upsert: true }, function (err, result) {
            client.close();
            if (err) {
                console.log('Failed to save value.');
                console.log(err);
                callback(false);
                return;
            }

            // TODO: do someting here to verify update
            callback(true);
            return;

            if (result.insertedCount !== events.length) {
                console.log('Some events arent inserted: ' + result.insertedCount + '/' + events.length);
                callback(false);
                return;
            }

            callback(true);
        });
    });
}

// Removes old cached events
function removeOldFromCache(timestamp) {
    var oldEvents = [];
    for (var i = 0; i < _cachedEvents.length; i++) {
        var evt = _cachedEvents[i];
        if (timestamp > evt.time) {
            oldEvents.push(i);
        }
    }

    oldEvents = oldEvents.reverse();

    for (var i = 0; i < oldEvents.length; i++) {
        _cachedEvents.splice(oldEvents[i], 1);
    }
}
