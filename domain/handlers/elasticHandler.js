var storage = require('../storage');
var moment = require('moment');
moment().format();
const { Client } = require('@elastic/elasticsearch')

// There can be many with the same order, but they shouldn't depend on other
// handlers with the same order
exports.order = 9;

var host = 'http://192.168.2.30:9200';
const client = new Client({ node: host })

exports.handle = function (event, value, cb) {
  const day = moment(event.regTime).format('YYYY-MM-DD');
  const index = 'homebackend_' + day;
  const clone = {
    sensorId: event.sensorId,
    regTime: event.regTime,
    value: event.value
  };

  if (typeof (clone.value) === 'string') {
    clone.textValue = clone.value;
    delete clone['value'];
  }

  console.log('Elatic handler called ' + index);
  console.log(clone);

  client.index({
    index: index,
    body: clone
  });

  cb();
}
