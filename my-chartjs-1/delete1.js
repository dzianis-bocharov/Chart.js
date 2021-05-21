
//var ctx = $('#mychart');

//var myChart = new Chart(ctx, {
//  type: 'bar',
  data: {
    datasets: chartDatasets
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        offset: true,
        type: 'timeseries',
        time: {
          parser: 'YYYY-MM-DD',
          tooltipFormat: 'll',
          unit: 'day',
          displayFormats: {
            day: 'MMM D'
          },
        },
        ticks: {
          source: 'data',
          align: 'center',
        },
        grid: {
          drawOnChartArea: false
        },
      },
      y: {
        stacked: true,
        type: 'linear',
        ticks: {
          beginAtZero: true
        },
        title: {
          display: true,
          text: 'kg Dry Matter / ha',
          font: {
            weight: "bold"
          }
        }
      }
    }
  },
  plugins: [{
    afterDatasetsDraw: function(chart, easing) {
      // To only draw at the end of animation, check for easing === 1
      var ctx = chart.ctx;
      var meta = chart.getDatasetMeta(0);
      if (!meta.hidden) {
        meta.data.forEach(function(element, index) {

          ctx.fillStyle = 'rgb(0, 0, 0)';
          ctx.font = ctx.font.replace(/\d+px/, "10px"); 
          ctx.font = ctx.font += " bold";
          var height = chart.boxes[3].bottom;
          var dataString = element.$context.raw.paddockLabel.toString();

          // Make sure alignment settings are correct
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.z - index

          var padding = 5;
          var position = element.tooltipPosition();
          ctx.fillText(dataString, position.x, (height - (height / position.y) / 2) - padding);
        });
      }
    }
  }]
});
});            
        </script>

    </head>
    <body>
        <div>
            test
        </div>

        <div id="chart-container" class="box-shadow-bottom col-12 px-0 bg-white" style="flex: 0 0 30%; overflow: hidden;">
            <div style="overflow: hidden;">
              <canvas id="mychart"></canvas>
            </div>
        </div>

    </body>
</html>





