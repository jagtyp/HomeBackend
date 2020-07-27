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

exports.getEvents = function (sensorId, since, until, callback) {
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

    mongoClient.connect(mongoUrl, function (err, client) {
        if (err) {
            console.log('Failed to connect to db');
            console.log(err);
            callback(null);
            return false;
        }

        var coll = client.db(dbName).collection('events');
        var query = {
            sensorId: { $eq: sensorId },
            time: { $gte: sinceUnix, $lte: untilUnix }
        };

        coll.find(query).sort({ time: 1 }).toArray(function (err, events) {
            if (err) {
                console.log('Failed to fetch items');
                console.log(err);
            }

            client.close();
            callback(events);
        });
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