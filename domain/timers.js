/**
* David - 2017-11-04
* Contains code for different timed events, such as periodically fetching data from external sources
**/

var config = require('../config');
var request = require('request');
var moment = require('moment');
moment().format();

// Starts all timers for used for the events
exports.startTimers = function () {
    setTimeout(() => {
        getFromTrafikverket();
    }, 5000);

    // Fetches data from trafikverket (Broen) every 10 minutes
    setInterval(getFromTrafikverket, 10 * 60 * 1000);
}

// Fetches data from trafikverkets open API: https://api.trafikinfo.trafikverket.se/API/Model
function getFromTrafikverket() {
    return;

    // Doesn't work any more!
    var requestXml =
        '<REQUEST>' +
        '  <LOGIN authenticationkey="' + config.credentials.smhiToken + '" />' +
        '  <QUERY objecttype="WeatherStation">' +
        '    <FILTER>' +
        '      <EQ name="Name" value="Broen" />' +
        '    </FILTER>' +
        '    <INCLUDE>Measurement.Air.Temp</INCLUDE>' +
        '    <INCLUDE>Measurement.MeasureTime</INCLUDE>' +
        '    <INCLUDE>Active</INCLUDE>' +
        '    <INCLUDE>Name</INCLUDE>' +
        '    <INCLUDE>Measurement.Air.RelativeHumidity</INCLUDE>' +
        '    <INCLUDE>Measurement.Wind.Force</INCLUDE>' +
        '    <INCLUDE>Measurement.Wind.ForceMax</INCLUDE>' +
        '    <INCLUDE>Measurement.Wind.Direction</INCLUDE>' +
        '    <INCLUDE>Measurement.Wind.DirectionText</INCLUDE>' +
        '    <INCLUDE>Measurement.Wind.DirectionIconId</INCLUDE>' +
        '  </QUERY>' +
        '</REQUEST>';

    request({
        url: 'http://api.trafikinfo.trafikverket.se/v1.3/data.json',
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: requestXml
    }, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            try {
                var parsed = JSON.parse(body);
                var result = parsed.RESPONSE.RESULT[0];
                var station = result.WeatherStation[0]; // Make sure we search for Name:Broen later on..
                var time = moment().valueOf();  // TODO: Use time in response

                console.log(station);

                // Submits the fetched values
                submitData('tv_broen_airTemp', station.Measurement.Air.Temp, time);
                submitData('tv_broen_airHumidity', station.Measurement.Air.RelativeHumidity, time);
                submitData('tv_broen_windForce', station.Measurement.Wind.Force, time);
                submitData('tv_broen_windForceMax', station.Measurement.Wind.ForceMax, time);
                submitData('tv_broen_windDirection', station.Measurement.Wind.Direction, time);
                submitData('tv_broen_windDirectionText', station.Measurement.Wind.DirectionText, time);
                return;

            } catch (e) {
                console.log(e);
            }
        }

        console.log('Failed to fetch data from trafikverket.');
        if (response) {
            console.log('Status code:' + response.statusCode);
        }
        if (error) {
            console.log(error);
        }
    });
}

// Sends data to our api as a request. Could probably go directly to the method in data..
function submitData(sensorId, value, time) {
    var postBody = {
        sensorId: sensorId,
        value: value,
        time: time
    };

    var options = {
        url: 'http://localhost:3001/data',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: postBody,
        json: true
    };

    request(options, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            console.log('posted value to api');
            console.log(body);
            return;
        }

        console.log('Failed to save data from trafikverket.');
        if (response) {
            console.log('Status code:' + response.statusCode);
        }

        if (error) {
            console.log(error);
        }
    });
}
