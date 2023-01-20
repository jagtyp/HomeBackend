var storage = require('../storage');
var request = require('request');
var moment = require('moment');
moment().format();

// There can be many with the same order, but they shouldn't depend on other
// handlers with the same order
exports.order = 11;

const url = 'https://david-home.in.bosbec.io/';
const authKey = '3d79fb96-4559-40cc-a7da-7d6c3989b064';

exports.handle = function (event, value, cb) {
  console.log('Bosbec handler is called');

  // Calling callback and returning, won't anything
  cb();
  return;

  // Only posting when we have proper values
  if (event.value === undefined || event.value === null || !parseInt(event.value)) {
    console.log('No proper value, wont post it');
    cb();
    return;
  }

  const time = moment();

  const requestData = JSON.stringify(
    {
      event: event
    }
  );

  try {
    request({
      url: url + 'add-data',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authKey },
      body: requestData
    }, (error, response, body) => {
      if (!error && (response.statusCode === 200 || response.statusCode === 202)) {
        console.log('Added data to bosbec in ' + moment().diff(time, 'milliseconds') + 'ms');
      } else {
        console.log('Failed to add data to bosbec. ' + (response.statusMessage ?? '') + " : " + (error ?? ''));
      }

      cb();
    });
  }
  catch (e) {
    console.log('Exception was thrown when adding data to bosbec. ' + e);

    cb();
  }
}
