var shuntChart = null;
var tankChart = null;
var chart = null;
var lastTankTop = null;
var lastTankBottom = null;
var colors = ['rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 0.2)', 'rgba(75, 192, 192, 0.2)',
                'rgba(153, 102, 255, 0.2)', 'rgba(255, 159, 64, 0.2)',
                'rgba(153,255,51,0.6)', 'rgba(255,153,0,0.6)', 'rgba(255,53,0,0.6)'];

var shunt = {
  in : 0,
  out : 0,
  diff : function(){
    return this.out - this.in;
  }};

var shuntData =  {
  labels: [],
  datasets: [
      {
          data: [0, 100],
          borderWidth: 0,
          backgroundColor: [
              "#FF6384",
              "#36A2EB"
          ]
      }]
    };

var tankData = {
    labels: [],
    label : false,
    datasets: [{
          data: [0],
          backgroundColor: "#36A2EB"
      },{
          data: [100],
          backgroundColor: "#FF6384"
      }]
};

$(document).ready(function(){
  setTime();
  addCharts();
  getData();
  connectMqtt();
});

function setTime(){
  setInterval(function () {
    $('#time').html(moment().format('MM-DD HH:mm:ss'));
  }, 100);
}

function addCharts(){
  // Adds chart for shunt
  var ctx = $("#shuntChart").get(0).getContext("2d");
  shuntChart = new Chart(ctx,{
      type:"doughnut",
      data: shuntData,
      animation:{
          animateScale:true
      }
  });

  // Adds chart for tank
  ctx = $("#tankChart").get(0).getContext("2d");

  tankChart = new Chart(ctx, {
    type: "bar",
    data: tankData,
    options: {
      legend : { display : false },
      scales: {
          xAxes: [{
            display : false,
              stacked: true
          }],
          yAxes: [{
            display : false,
            ticks: {
                beginAtZero:true
            },
            stacked: true
          }]
        }
      }
  });

  // Adds the bar chart
  var ctx = $("#chart").get(0).getContext("2d");
  var data = {
    labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    datasets: [{
      label: 'Shunt',
      data: [0, 0, 0, 0, 0, 0, 0],
      backgroundColor: "rgba(153,255,51,0.6)"
    }]
  };

  chart = new Chart(ctx, {
    type : 'line',
    data: data
  });
}

function getData(){
  $.get('/data/latest?sensorId=temp1',
    function(response){
      var temp = Math.round(response.median * 100) / 100;
      $('#inside').html(temp + ' &deg;C');

      setTimeout(function(){
          getData();
        }, 15000);
    });

    $.get('/data/latest?sensorId=outsideTemp',
      function(response){
        var temp = Math.round(response.median * 100) / 100;
        $('#outside').html(temp + ' &deg;C');
      });

      $.get('/data/latest?sensorId=shuntServo',
        function(response){
          var min = 30;
          var max = 170;
          var span = max - min;
          var value = ((response.median - min)/span) *100;
          shuntData.datasets[0].data[0] = value;
          shuntData.datasets[0].data[1] = 100 - value;

          shuntChart.update();
        });

        $.get('/data/latest?sensorId=shuntTempOut',
          function(response){
            shunt.out = response.median;
            var temp = Math.round(response.median * 100) / 100;
              $('#shuntOut').html(temp + '&deg;C');
          });

        $.get('/data/latest?sensorId=shuntTempIn',
          function(response){
            shunt.in = response.median;

            var temp = Math.round(response.median * 100) / 100;
              $('#shuntIn').html(temp + '&deg;C');
              temp = Math.round(shunt.diff() * 100) / 100;
              $('#shuntDiff').html(temp + '&deg;C');
          });

        $.get('/data/latest?sensorId=tankTempTop',
          function(response){
            lastTankTop = response;
            evaluateTank();
          });

        $.get('/data/latest?sensorId=tankTempBottom',
          function(response){
            lastTankBottom = response;
            evaluateTank();
          });

        $.get('/data/latest?sensorId=tank1', // tank
          function(response){
            var min = 10;
            var max = 520;

            var value = Math.round((100 - ((response.median - min) / max) * 100) * 100) / 100;
            value = value < 0 ? 0.00 : value;

            tankData.datasets[0].data[0] = value;
            tankData.datasets[1].data[0] = 100 - value;

            tankChart.update();
          });

        //  $.get('/data?sensors=shuntServo&sensors=none',
        $.get('/data?sensors=tankTempTop&sensors=tankTempBottom',
            function(response){
              setChartData(response);
            });
}

function evaluateTank(){
 if(!lastTankTop ||
    !lastTankBottom){
      return;
    }

  var top = lastTankTop;
  var btm = lastTankBottom;

  var status = 'none';

  if((top.trend === 1 &&
      top.trendDifference > 0.2) ||
    (btm.trend === 1 &&
      btm.trendDifference > 0.2)){
        status = 'burn';
      }
  else if(top.median < 75){
    status = 'warn';
  }

  $('#status .burning').css('display', 'none');
  $('#status .warning').css('display', 'none');

  switch (status) {
    case 'burn':
      $('#status .burning').css('display', 'block');
      break;
    case 'warn':
      $('#status .warning').css('display', 'block');
      break;
    default:  // none
  }
}

function setChartData(response){
  var labels = [];

  var lastSensor = '';
  var dataIndex = -1;

  response = response.reverse();
  for (var i = 0; i < response.length; i++) {
    var value = response[i];
    if(lastSensor !== value.sensorId){
      lastSensor = value.sensorId;
      dataIndex++;

      if(!chart.data.datasets[dataIndex]){
        chart.data.datasets[dataIndex] = {
          label : lastSensor,
          backgroundColor : colors[dataIndex],
          data : [],
          pointRadius : 0
        };
      } else {
        chart.data.datasets[dataIndex].data = [];
        chart.data.datasets[dataIndex].label = lastSensor;
        chart.data.datasets[dataIndex].backgroundColor = colors[dataIndex];
        chart.data.datasets[dataIndex].pointRadius = 0;
      }
    }

    if(dataIndex === 0){
      labels.push(moment(value.time).format('HH:mm'));
    }

    chart.data.datasets[dataIndex].data.push(value.value);
  }

  chart.data.labels = labels;
  chart.update();
}

function connectMqtt() {
    var client = mqtt.connect('ws://192.168.2.161:1884'); // you add a ws:// url here
    client.subscribe("#");

    var rows = [];

    client.on("message",
        function (topic, payload) {
            var row = '<p>' + topic + ' : ' + payload + '</p>';
            rows.unshift(row);

            if (rows.length > 10) {
                rows.pop();
            }

            $('#mqttLog').html(rows.join(''));

           // client.end();
        });
}