var chart = null;

$(document).ready(function(){
  getData();
});

function getData(){
  $.ajax({
    //url: '/data',
    url: '/data?sensors=ivt-compressorIn&sensors=ivt-compressorOut&sensors=ivt-elementIn&sensors=ivt-elementOut&sensors=ivt-element1',
    data: {},
    success: function(response){
      processDataResponse(response);
    },
    complete: function(xhr, status){
      setTimeout(function(){
        getData();
      }, 15000);
    },
    dataType: 'json',
    method : 'GET'
  });
}

function processDataResponse(response){
  var sets = [];
  response = response.reverse();
  for (var i = 0; i < response.length; i++) {
    var value = response[i];
    if(!sets[value.sensorId]){
      sets[value.sensorId] = {
        name : value.sensorId,
        values : []
      };
    }

    sets[value.sensorId].values.push(value.median);
  }

  console.log(sets);

var colors = ['rgba(255, 99, 132, 0.2)', 'rgba(54, 162, 235, 0.2)',
                'rgba(255, 206, 86, 0.2)', 'rgba(75, 192, 192, 0.2)',
                'rgba(153, 102, 255, 0.2)', 'rgba(255, 159, 64, 0.2)',
                'rgba(153,255,51,0.6)', 'rgba(255,153,0,0.6)', 'rgba(255,53,0,0.6)'];

  var data = {
    labels: [],
    datasets: []
  };

var index = 0;
  for (var name in sets) {
    if (sets.hasOwnProperty(name)) {
      var values = sets[name];
      console.log(values);
      data.datasets.push({
        label: values.name,
        backgroundColor: colors[index],
        data: values.values
      });

      if(data.labels.length < values.values.length)
      {
        data.labels = []; // Very ugly..
        for (var i = 0; i < values.values.length; i++) {
          data.labels.push('');
        }
      }

      index++;
    }
  }

  updateChart(data);
}

function updateChart(data){
/*  data = {
    labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    datasets: [{
      label: 'apples',
      data: [12, 19, 3, 17, 6, 3, 7],
      backgroundColor: "rgba(153,255,51,0.6)"
    }, {
      label: 'oranges',
      data: [2, 29, 5, 5, 2, 3, 10],
      backgroundColor: "rgba(255,153,0,0.6)"
    }]
  };*/

  // Checks if global chart is set
  if(chart){
    for(var i = 0; i < data.datasets.length; i++){
      chart.data.datasets[i].data = data.datasets[i].data;
    }

    chart.data = data;
    chart.update();
    return;
  }

  var options = {};
  // Get context with jQuery - using jQuery's .get() method.
  var ctx = $("#myChart").get(0).getContext("2d");

  // Sets global chart
  chart = new Chart(ctx, {
    type : 'line',
    data: data
  });
}
