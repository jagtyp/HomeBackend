var shuntChart = null;
var tankChart = null;
var chart = null;
var wattTodayChart = null;
var wattPerMinuteChart = null;
var wattPerHourChart = null;
var wattPerDayChart = null;
var lastTankTop = null;
var lastTankBottom = null;
var colors = ['rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 1)',
    'rgba(255, 206, 86, 0.2)', 'rgba(75, 192, 192, 0.2)',
    'rgba(153, 102, 255, 0.2)', 'rgba(255, 159, 64, 0.2)',
    'rgba(153,255,51,0.6)', 'rgba(255,153,0,0.6)', 'rgba(255,53,0,0.6)'];

var settings = {
    energyChart: 'hour'
};

function init() {
    getSettings();
    applySettings();
}

function getSettings() {
    var s = localStorage.getItem("settings");
    if (!s) {
        return;
    }

    settings = JSON.parse(s);
}

function saveSettings() {
    var s = JSON.stringify(settings);
    localStorage.setItem("settings", s);
}

function applySettings() {
    switchWattGraph(settings.energyChart);
}

var shunt = {
    in: 0,
    out: 0,
    diff: function () {
        return this.out - this.in;
    }
};

var shuntData = {
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
    label: false,
    datasets: [{
        data: [0],
        backgroundColor: "#36A2EB"
    }, {
        data: [100],
        backgroundColor: "#FF6384"
    }]
};

$(document).ready(function () {
    setTime();
    addCharts();
    getData();
    //connectMqtt();
});

function setTime() {
    setInterval(function () {
        $('#time').html(moment().format('MM-DD HH:mm:ss'));
    }, 100);
}

function addCharts() {
    // Adds chart for shunt
    var ctx = $("#shuntChart").get(0).getContext("2d");
    shuntChart = new Chart(ctx, {
        type: "doughnut",
        data: shuntData,
        animation: {
            animateScale: true
        }
    });

    // Adds chart for tank
    ctx = $("#tankChart").get(0).getContext("2d");

    tankChart = new Chart(ctx, {
        type: "bar",
        data: tankData,
        options: {
            scales: {
                xAxes: [{
                    ticks: {
                        min: 60 // Edit the value according to what you need
                    }
                }],
                yAxes: [{
                    stacked: true
                }]
            }
        }
    });

    // Adds the bar chart
    ctx = $("#chart").get(0).getContext("2d");
    var data = {
        labels: [],
        datasets: [{
            label: 'Tank',
            data: [],
            backgroundColor: "rgba(153,255,51,0.6)"
        }]
    };

    chart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                        unit: 'minute',
                        distribution: 'linear',
                        displayFormats: {
                            minute: 'HH:mm'
                        },
                        stepSize: 15
                    }
                }]
            }
        }
    });

    // Adds energy chart
    ctx = $("#wattTodayChart").get(0).getContext("2d");
    var data = {
       labels: [],
       datasets: [{
           label: 'Watt',
           data: [],
           backgroundColor: colors[0],
       }]
    };

    wattTodayChart = new Chart(ctx, {
       type: 'horizontalBar',
       data: JSON.parse(JSON.stringify(data)),
       options: {
           scales: {
               xAxes: [{
                   type: 'time',
                   time: {
                       unit: 'minute',
                       distribution: 'linear',
                       displayFormats: {
                           minute: 'HH:mm'
                       },
                       stepSize: 20
                   }
               }]
           }
       }
    });

    ctx = $("#wattPerMinuteChart").get(0).getContext("2d");
    var data = {
        labels: [],
        datasets: [{
            label: 'Watt',
            data: [],
            backgroundColor: colors[0],
            pointRadius: 0
        }]
    };

    wattPerMinuteChart = new Chart(ctx, {
        type: 'line',
        data: JSON.parse(JSON.stringify(data)),
        options: {
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                        unit: 'minute',
                        distribution: 'linear',
                        displayFormats: {
                            minute: 'HH:mm'
                        },
                        stepSize: 20
                    }
                }]
            }
        }
    });

    ctx = $("#wattPerHourChart").get(0).getContext("2d");
    wattPerHourChart = new Chart(ctx, {
        type: 'bar',
        data: JSON.parse(JSON.stringify(data)),
        options: {
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                        unit: 'hour',
                        distribution: 'linear',
                        displayFormats: {
                            hour: 'HH:mm'
                        },
                        stepSize: 5
                    }
                }]
            }
        }
    });

    ctx = $("#wattPerDayChart").get(0).getContext("2d");
    wattPerDayChart = new Chart(ctx, {
        type: 'bar',
        data: JSON.parse(JSON.stringify(data)),
        options: {
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                        unit: 'day',
                        distribution: 'linear',
                        displayFormats: {
                            day: 'M-DD'
                        },
                        stepSize: 1
                    }
                }]
            }
        }
    });
}

function getData() {
    /*  $.ajax({ ...}).then(function () {
          return $.ajax({ ...});
      }).then(function () {
          return $.ajax({ ...});
      }).then(function () {
          return $.ajax({ ...});
      }).then(function () {
          return $.ajax({ ...});
      });
      */

    $.get('/data/latest?sensorId=temp1',
        function (response) {
            var temp = Math.round(response.value * 100) / 100;
            $('#inside').html(temp + ' &deg;C');

        }).then(function () {
            return $.get('/data/latest?sensorId=temp2/humidity',
                function (response) {
                    var temp = Math.round(response.value * 100) / 100;
                    $('#bedroomhumid').html(temp + ' %');
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=temp2/temperature',
                function (response) {
                    var temp = Math.round(response.value * 100) / 100;
                    $('#bedroomtemp').html(temp + ' &deg;C');
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=temp1/humidity',
                function (response) {
                    var temp = Math.round(response.value * 100) / 100;
                    $('#upstarishumid').html(temp + ' %');
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=temp1/temperature',
                function (response) {
                    var temp = Math.round(response.value * 100) / 100;
                    $('#upstairstemp').html(temp + ' &deg;C');
                });
        }).then(function () {
            return $.get('/data/watt',
                function (response) {
                    var watt = Math.round(response);
                    $('#watt').html(watt);
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=outsideTemp',
                function (response) {
                    var temp = Math.round(response.value * 100) / 100;
                    $('#outside').html(temp + ' &deg;C');
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=shuntServo',
                function (response) {
                    var min = 30;
                    var max = 170;
                    var span = max - min;
                    var value = ((response.value - min) / span) * 100;
                    shuntData.datasets[0].data[0] = value;
                    shuntData.datasets[0].data[1] = 100 - value;

                    shuntChart.update();
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=shuntTempOut',
                function (response) {
                    shunt.out = response.value;
                    var temp = Math.round(response.value * 100) / 100;
                    $('#shuntOut').html(temp + '&deg;C');
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=targetTemperature',
                function (response) {
                    shunt.out = response.value;
                    var temp = Math.round(response.value * 100) / 100;
                    $('#shuntTarget').html(temp + '&deg;C');
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=shuntTempIn',
                function (response) {
                    shunt.in = response.value;

                    var temp = Math.round(response.value * 100) / 100;
                    $('#shuntIn').html(temp + '&deg;C');
                    temp = Math.round(shunt.diff() * 100) / 100;
                    $('#shuntDiff').html(temp + '&deg;C');
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=tankTempTop',
                function (response) {
                    lastTankTop = response;
                    evaluateTank();
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=tankTempBottom',
                function (response) {
                    lastTankBottom = response;
                    evaluateTank();
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=tank1', // tank
                function (response) {
                    var min = 10;
                    var max = 520;

                    var value = Math.round((100 - ((response.median - min) / max) * 100) * 100) / 100;
                    value = value < 0 ? 0.00 : value;

                    tankData.datasets[0].data[0] = value;
                    tankData.datasets[1].data[0] = 100 - value;

                    tankChart.update();
                });
        }).then(function () {
            return $.get('/data?sensors=tankTempTop&sensors=tankTempBottom&sensors=burnerControl/boilerTemp',
                function (response) {
                    setChartData(response);
                });
        }).then(function () {
            return $.get('/data/wattPerMinute',
                function (response) {
                    updateWattPerMinute(response);
                });
        }).then(function () {
            return $.get('/data/wattPerHour',
                function (response) {
                    updateWattPerHour(response);
                });
        }).then(function () {
            return $.get('/data/wattPerDay',
                function (response) {
                    updateTodayChart(response);
                    updateWattPerDay(response);
                });
        }).done(function () {
            console.log('Resetting timer');
            setTimeout(function () {
                getData();
            },
                15000);
        });
}

function evaluateTank() {
    if (!lastTankTop ||
        !lastTankBottom) {
        return;
    }

    var top = lastTankTop;
    var btm = lastTankBottom;

    var status = 'none';

    if ((top.trend === 1 &&
        top.trendDifference > 0.2) ||
        (btm.trend === 1 &&
            btm.trendDifference > 0.2)) {
        status = 'burn';
    }
    else if (top.median < 75) {
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

function setChartData(response) {
    var labels = [];

    var lastSensor = '';
    var dataIndex = -1;

    response = response.reverse();
    for (var i = 0; i < response.length; i++) {
        var value = response[i];
        if (lastSensor !== value.sensorId) {
            lastSensor = value.sensorId;
            dataIndex++;

            if (!chart.data.datasets[dataIndex]) {
                chart.data.datasets[dataIndex] = {
                    label: lastSensor,
                    backgroundColor: colors[dataIndex],
                    data: [],
                    pointRadius: 0
                };
            } else {
                chart.data.datasets[dataIndex].data = [];
                chart.data.datasets[dataIndex].label = lastSensor;
                chart.data.datasets[dataIndex].backgroundColor = colors[dataIndex];
                chart.data.datasets[dataIndex].pointRadius = 0;
            }
        }

        if (dataIndex === 0) {
            labels.push(moment(value.time));
        }

        chart.data.datasets[dataIndex].data.push(value.value);
    }

    chart.data.labels = labels;
    chart.update();
}

function switchWattGraphTo(view) {
    settings.energyChart = view;
    switchWattGraph(view);
    saveSettings();
}

function switchWattGraph(view) {
    $('#wattContainer .charts div').css('display', 'none');

    switch (view) {
        case 'minute':
            $('#wattMinute').css('display', 'block');
            break;
        case 'hour':
            $('#wattHour').css('display', 'block');
            break;
        case 'day':
            $('#wattDay').css('display', 'block');
            break;
    }
}

function updateTodayChart(response) {
    var data = JSON.parse(response);
    //data = data.reverse();

    wattTodayChart.data = {
        labels: [
                "ME",
                "SE"
            ],
            datasets: [
            {
                label: "Test",
                data: [100, 75],
                backgroundColor: ["#669911", "#119966" ],
                hoverBackgroundColor: ["#66A2EB", "#FCCE56"]
            }]
    };
    wattTodayChart.update();


    return;
    var chartData = wattTodayChart.data;
    chartData.datasets[0].data = [];
    chartData.labels = [];

    for (var i = 0; i < data.length; i++) {
        chartData.labels.push(data[i]._id);
        chartData.datasets[0].data.push(data[i].value);
        
        if (i > 1) {
            break;
        }
    }

    wattTodayChart.update();
}

function updateWattPerMinute(response) {
    var data = JSON.parse(response);
    data = data.reverse();

    var chartData = wattPerMinuteChart.data;
    chartData.datasets[0].data = [];
    chartData.labels = [];

    for (var i = 0; i < data.length; i++) {
        chartData.labels.push(data[i]._id);
        chartData.datasets[0].data.push(data[i].value);
    }

    wattPerMinuteChart.update();
}

function updateWattPerHour(response) {
    var data = JSON.parse(response);
    data = data.reverse();

    var chartData = wattPerHourChart.data;
    chartData.datasets[0].data = [];
    chartData.labels = [];

    for (var i = 0; i < data.length; i++) {
        chartData.labels.push(data[i]._id);
        chartData.datasets[0].data.push(data[i].value);
    }

    wattPerHourChart.update();
}

function updateWattPerDay(response) {
    var data = JSON.parse(response);
    data = data.reverse();

    var chartData = wattPerDayChart.data;
    chartData.datasets[0].data = [];
    chartData.labels = [];

    for (var i = 0; i < data.length; i++) {
        chartData.labels.push(data[i]._id);
        chartData.datasets[0].data.push(data[i].value);
    }

    wattPerDayChart.update();
}

init();

/*
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
*/