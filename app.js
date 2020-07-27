/**
 * David 2016-07-03
 */

//------------------------------------------------------
//API methods in node.js using express
//Web Link=> http://stackoverflow.com/questions/35813290/how-to-write-api-methods-nodejs-express-3-application-in-visual-studio-2015/35813955#35813955
//------------------------------------------------------

var express = require('express')
var bodyParser = require('body-parser');
var eventHandlers = require('./domain/eventHandlers');
var storage = require('./domain/storage');
var timers = require('./domain/timers');
var mqtt = require('./mqtt/mqttService');

//var multer = require('multer');
//var upload = multer();
var routes = require('./routes');

var port = 3001;

eventHandlers.loadModules();

timers.startTimers();

var app = express();
app.use(bodyParser.json());                          // for parsing application/json
//app.use(bodyParser.urlencoded({ extended: true }))   // for parsing application/x-www-form-urlencoded


// Registers the routes
routes.register(app);

// Adding static file hosting
app.use(express.static('static'));


//you can check if server running
app.get('/live', function (req, res) {
    res.send('Yes I am breathing!');
})

app.listen(port, function(){
  console.log('Server listening on port: ' + port);
});
