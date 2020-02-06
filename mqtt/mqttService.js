/**
 * David 2018-01-18
 */

var storage = require('../domain/storage');
var moment = require('moment');
moment().format();
var eventsHandlers = require('../domain/eventHandlers');

var mqtt = require('mqtt');

var client = mqtt.connect('mqtt://192.168.2.30'); // mosquitto server

client.on('connect',
    function () {
        client.subscribe('#');
        client.publish('/backend', 'Hello mqtt, I\'m online!');
    });

client.on('message', function (topic, message) {
    var events = [];
    var messageText = message.toString();

    console.log(topic + ' | ' + messageText);

    var value = parseFloat(messageText);
    if (isNaN(value)) {
        //console.warn('Couldn\'t parse the value \'' + message + '\' to float!');
        return;
    }

    events.push({
        sensorId: topic,
        value: value,
        regTime: new Date(),
        time: moment().unix()
    });


    // Code below is duplicate from data.js
    // Save events to db
    storage.saveEvents(events, function (result) {
        if (!result) {
            return;
        }

        for (var i = 0; i < events.length; i++) {
            handleSavedEvent(events[i]);
        }
    });
});

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
