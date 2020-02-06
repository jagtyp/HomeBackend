var config = require('../../config');
var storage = require('../storage');
var moment = require('moment');
var request = require('request');
moment().format();

// There can be many with the same order, but they shouldn't depend on other
exports.order = 10;

var receivers = config.credentials.smsReceivers;
var tankTopEvents = 0;
var shuntTopEvents = 0;

exports.handle = function(event, value, cb){
  console.log(event.sensorId + ' called the alarmHandler with value ' + event.value);
  checkEvent(event);
  cb();
}

// Gör att den kollar olika larm ifrån db, så blir de enklare att konfigurera nya larm
function checkEvent(event){
  if(event.sensorId === 'tankTempTop'){
    if(event.value > 95){ // 95
      tankTopEvents++;
      console.log(event.sensorId + ' has been called ' + tankTopEvents + ' times.');
      if(tankTopEvents === 10){
        sendAlarm('Nu verkar det lite varmt i tanken! ' + event.value + 'grader!');
      }

      return;
    }
    if(event.value < 75){ // 75
      tankTopEvents++;
      console.log(event.sensorId + ' has been called ' + tankTopEvents + ' times.');
      if(tankTopEvents === 10){
        sendAlarm('Nu verkar det lite kallt i tanken! ' + event.value + 'grader!');
      }

      return;
    }

    if(tankTopEvents > 10){
      sendAlarm('Nu verkar temperaturen okej igen. ' + event.value + 'grader.');
    }

    tankTopEvents = 0;
  }

  if(event.sensorId === 'shuntTempOut'){
    if(event.value > 45){ // 45
      shuntTopEvents++;
      console.log(event.sensorId + ' has been called ' + shuntTopEvents + ' times.');
      if(tankTopEvents === 10){
        sendAlarm('Nu har elementen blivit varma! ' + event.value + 'grader!');
      }

      return;
    }

    if(shuntTopEvents > 10){
      sendAlarm('Nu verkar temperaturen okej igen. ' + event.value + 'grader.');
    }

    shuntTopEvents = 0;
  }
}

function sendAlarm(message){
  for (var i = 0; i < receivers.length; i++) {
    var receiver =  receivers[i];
    console.log('Sending ' + message + ' to ' + receiver);

    // Do this with MobileResponse instead..
    var url = 'https://live.mobileaction.se/api/send.aspx?id=' + config.credentials.maToken + '&to=' + receiver + '&message=' + message + '&sendername=Hemma';

    request({
      url : url,
      method : 'POST',
      body : ''
    }, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        console.log('Sent message to ' + receiver);
        return;
      }

      console.log('Failed to send message');

      if(error){
        console.log(error);
      }
    });
  }
}
