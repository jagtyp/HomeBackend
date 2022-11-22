var shuntChart = null;
var tankChart = null;
var printerProgress = null;
var chart = null;
var wattTodayChart = null;
var wattPerMinuteChart = null;
var wattPerHourChart = null;
var wattPerDayChart = null;
var burnerRelay = null;
var lastTankTop = null;
var lastTankBottom = null;
var minTankTopValue = null;
var maxTankBottomValue = null;
var linesSet = false;
var colors = ['rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)',
    'rgba(255, 206, 86, 0.5)', 'rgba(75, 192, 192, 0.2)',
    'rgba(153, 102, 255, 0.2)', 'rgba(255, 159, 64, 0.2)',
    'rgba(153,255,51,0.6)', 'rgba(255,153,0,0.6)', 'rgba(255,53,0,0.6)'];

var settings = {
    energyChart: 'hour'
};

var minTankTopValue = 75;

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
        labels: [],
        options: {
            layout: {
                padding: 0
            },
            legend: {
                display: false,
            },
            scales: {
                xAxes: [{
                    ticks: {
                        min: 60 // Edit the value according to what you need
                    },
                    stacked: true
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
            return $.get('/data/latest?sensorId=tv_broen_airTemp',
                function (response) {
                    var temp = Math.round(response.value * 100) / 100;
                    $('#outside').html(temp + ' &deg;C');
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=shunt/outsideTemp',
                function (response) {
                    var temp = Math.round(response.value * 100) / 100;
                    $('#shuntOutside').html(temp + ' &deg;C');
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=shunt/shuntPosition',
                function (response) {
                    var min = 30;
                    var max = 170;
                    var value = response.value;
                    shuntData.datasets[0].data[0] = value;
                    shuntData.datasets[0].data[1] = 100 - value;

                    shuntChart.update();
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=shunt/shuntOutTemp',
                function (response) {
                    shunt.out = response.value;
                    var temp = Math.round(response.value * 100) / 100;
                    $('#shuntOut').html(temp + '&deg;C');
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=shunt/targetTemp',
                function (response) {
                    shunt.out = response.value;
                    var temp = Math.round(response.value * 100) / 100;
                    $('#shuntTarget').html(temp + '&deg;C');
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=shunt/shuntInTemp',
                function (response) {
                    shunt.in = response.value;

                    var temp = Math.round(response.value * 100) / 100;
                    $('#shuntIn').html(temp + '&deg;C');
                    temp = Math.round(shunt.diff() * 100) / 100;
                    $('#shuntDiff').html(temp + '&deg;C');
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=minAccTop',
                function (response) {
                    minTankTopValue = response.value;
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=maxAccBottom',
                function (response) {
                    maxTankBottomValue = response.value;
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=burnerControl/relayStatus',
                function (response) {
                    burnerRelay = response.value;
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=burnerControl/accTopTemp',
                function (response) {
                    lastTankTop = response;
                    evaluateTank();
                });
        }).then(function () {
            return $.get('/data/latest?sensorId=burnerControl/accBottomTemp',
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
            //return $.get('/data?sensors=tankTempTop&sensors=tankTempBottom&sensors=burnerControl/boilerTemp', // Old version
            return $.get('/data?sensors=burnerControl/status&sensors=burnerControl/accCenterTemp&sensors=burnerControl/accTopTemp&sensors=burnerControl/accBottomTemp&sensors=burnerControl/boilerTemp',
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
            // }).then(function () {
            //     return $.ajax('http://192.168.2.158/api/job', {
            //         headers: { 'X-Api-Key': 'A43183682ECE4C0DB6D433F5EDCF618A' },
            //         success: function (response) {
            //             handlePrinterResponse(response);
            //         }
            //     });
        }).done(function () {
            console.log('Resetting timer');
            setTimeout(function () {
                getData();
            },
                15000);
        });
}

function handlePrinterResponse(response) {
    // response = JSON.parse('{"job":{},"progress":{"completion": 0.11967628504760736,"filepos": 955,"printTime": 3,"printTimeLeft": null,"printTimeLeftOrigin": "linear"},"state": "Printing"}');

    if (response.state === 'Printing') {
        if ($('#printContainer').css('display') !== 'block') {
            $('#printContainer').css('display', 'block');
            $('#printContainer img').attr('src', 'http://192.168.2.158/webcam/?action=stream&' + Date.now());
        }

        var progress = response.progress.completion;
        progress = Math.round(progress * 100) / 100
        console.log(progress);

        $('#printProgress .progress-bar').css('width', progress + '%');
        $('#printProgress .progress-bar').attr('aria-valuenow', progress);
        $('#printProgress .progress-bar').text(progress + '%');

    }
    else {
        $('#printContainer').css('display', 'none');
        $('#printContainer img').attr('src', 'https://25.media.tumblr.com/8e752cf446947d3d01c0eaaf9e1504e2/tumblr_ml120j5dPc1r1mcxco1_400.gif');
    }
}

function evaluateTank() {
    if (!lastTankTop ||
        !lastTankBottom) {
        return;
    }

    var top = lastTankTop;
    var btm = lastTankBottom;

    var status = 'none';

    // if ((top.trend === 1 &&
    //     top.trendDifference > 0.2) ||
    //     (btm.trend === 1 &&
    //         btm.trendDifference > 0.2)) {
    //     status = 'burn';
    // }
    if (burnerRelay == 1) {
        status = 'burn';
    }
    else if (top.median < (minTankTopValue - 2)) {
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
        var dataSet = chart.data.datasets[dataIndex];

        if(value.value > 150 || value.value < -50){
            continue;
        }

        if (lastSensor !== value.sensorId) {
            lastSensor = value.sensorId;
            dataIndex++;
            dataSet = chart.data.datasets[dataIndex];

            if (!dataSet) {
                dataSet = {
                    label: lastSensor,
                    backgroundColor: colors[dataIndex],
                    data: [],
                    pointRadius: 0
                };

                chart.data.datasets[dataIndex] = dataSet;
            } else {
                dataSet.data = [];
                dataSet.label = lastSensor;
                dataSet.backgroundColor = colors[dataIndex];
                dataSet.pointRadius = 0;
            }
        }

        if (dataIndex === 0) {
            labels.push(moment(value.time));
        }

        dataSet.label = getLabelName(value.sensorId, value.value);
        dataSet.data.push(value.value);
    }

    function getLabelName(sensorId, value) {
        switch (sensorId) {
            case 'burnerControl/boilerTemp':
                return 'Panna - ' + value;
            case 'burnerControl/accTopTemp':
                return 'AckTop - ' + value;
            case 'burnerControl/accCenterTemp':
                return 'AckMitten - ' + value;
            case 'burnerControl/accBottomTemp':
                return 'AckBotten - ' + value;
            case 'burnerControl/status':
                return 'Status - ' + (value == 0 ? 'Av' : 'På');
            default:
                return sensorId + ' - ' + value;
        }
    }

    // Adds min and max lines to chart
    // TODO: Need to make sure these are dispayed as lines and not areas
    // if (!linesSet) {
    //     linesSet = true;
    //     var lines = [{
    //         label: 'MinTop',
    //         data: [],
    //         backgroundColor: colors[4],
    //         type: 'line'
    //     }, {
    //         label: 'MaxBottom',
    //         data: [],
    //         backgroundColor: colors[5],
    //         showLine : false,
    //         fill: false,
    //         type: 'line'
    //     }];

    //     for (var i = 0; i < labels.length; i++) {
    //         lines[0].data.push(minTankTopValue);
    //         lines[1].data.push(maxTankBottomValue);
    //     }
    //     chart.data.datasets.push(lines[0]);
    //     chart.data.datasets.push(lines[1]);
    // }

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
                backgroundColor: ["#669911", "#119966"],
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