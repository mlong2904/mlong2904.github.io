/**
 * Apparel Demand & Inventory Model. A JavaScript port of the two-country model in
 * `data/apparel/Apparel_Demand_Model.xlsx` (MGMT 472, Purdue).
 *
 * Monthly average land temperatures for the United States and Canada come from the
 * Berkeley Earth record (2000-02 to 2013-09), and FORECAST.ETS with a 12-month
 * seasonality projects each series forward. Demand is derived from the forecast
 * temperature by the workbook's own formulas.
 *
 * Demand here is the expected path: the workbook adds a N(0, 50) noise term per
 * month, which has mean zero and would only make the charts jitter. The inventory
 * draw stays stochastic, because the buffer-vs-cost tradeoff only exists when
 * stocking decisions are made before demand is known.
 */
(function () {
  "use strict";

  /* [ISO month, average temperature in degrees Celsius]. null = the workbook's
     FORECAST.ETS returned #N/A for that month. */
  const US_HISTORY = [
    ["2000-02-01",8.116],
    ["2000-03-01",11.348],
    ["2000-04-01",14.127],
    ["2000-05-01",19.614],
    ["2000-06-01",22.743],
    ["2000-07-01",24.179],
    ["2000-08-01",24.633],
    ["2000-09-01",21.317],
    ["2000-10-01",15.801],
    ["2000-11-01",8.516],
    ["2000-12-01",3.701],
    ["2001-01-01",4.025],
    ["2001-02-01",6.383],
    ["2001-03-01",9.098],
    ["2001-04-01",14.213],
    ["2001-05-01",19.598],
    ["2001-06-01",22.819],
    ["2001-07-01",24.438],
    ["2001-08-01",24.881],
    ["2001-09-01",20.973],
    ["2001-10-01",15.978],
    ["2001-11-01",12.429],
    ["2001-12-01",7.22],
    ["2002-01-01",6.133],
    ["2002-02-01",7.216],
    ["2002-03-01",9.229],
    ["2002-04-01",14.985],
    ["2002-05-01",17.726],
    ["2002-06-01",23.011],
    ["2002-07-01",25.367],
    ["2002-08-01",24.592],
    ["2002-09-01",22.261],
    ["2002-10-01",15.15],
    ["2002-11-01",10.182],
    ["2002-12-01",5.85],
    ["2003-01-01",4.883],
    ["2003-02-01",5.295],
    ["2003-03-01",10.411],
    ["2003-04-01",13.305],
    ["2003-05-01",18.356],
    ["2003-06-01",21.821],
    ["2003-07-01",25.328],
    ["2003-08-01",25.085],
    ["2003-09-01",21.327],
    ["2003-10-01",16.781],
    ["2003-11-01",10.861],
    ["2003-12-01",6.166],
    ["2004-01-01",4.037],
    ["2004-02-01",5.446],
    ["2004-03-01",12.205],
    ["2004-04-01",14.423],
    ["2004-05-01",19.524],
    ["2004-06-01",22.146],
    ["2004-07-01",24.301],
    ["2004-08-01",23.363],
    ["2004-09-01",21.656],
    ["2004-10-01",16.06],
    ["2004-11-01",10.608],
    ["2004-12-01",6.002],
    ["2005-01-01",5.496],
    ["2005-02-01",7.218],
    ["2005-03-01",9.231],
    ["2005-04-01",13.83],
    ["2005-05-01",17.768],
    ["2005-06-01",22.597],
    ["2005-07-01",25.53],
    ["2005-08-01",24.938],
    ["2005-09-01",22.083],
    ["2005-10-01",16.149],
    ["2005-11-01",11.724],
    ["2005-12-01",5.386],
    ["2006-01-01",7.791],
    ["2006-02-01",6.494],
    ["2006-03-01",9.362],
    ["2006-04-01",14.968],
    ["2006-05-01",18.94],
    ["2006-06-01",23.295],
    ["2006-07-01",26.048],
    ["2006-08-01",24.736],
    ["2006-09-01",20.47],
    ["2006-10-01",15.046],
    ["2006-11-01",11.362],
    ["2006-12-01",7.399],
    ["2007-01-01",4.913],
    ["2007-02-01",4.777],
    ["2007-03-01",11.876],
    ["2007-04-01",13.225],
    ["2007-05-01",19.07],
    ["2007-06-01",22.709],
    ["2007-07-01",24.59],
    ["2007-08-01",25.415],
    ["2007-09-01",21.712],
    ["2007-10-01",17.231],
    ["2007-11-01",11.01],
    ["2007-12-01",5.785],
    ["2008-01-01",4.449],
    ["2008-02-01",6.338],
    ["2008-03-01",9.771],
    ["2008-04-01",13.896],
    ["2008-05-01",17.741],
    ["2008-06-01",23.385],
    ["2008-07-01",24.906],
    ["2008-08-01",24.166],
    ["2008-09-01",21.575],
    ["2008-10-01",15.815],
    ["2008-11-01",10.783],
    ["2008-12-01",5.43],
    ["2009-01-01",4.443],
    ["2009-02-01",6.874],
    ["2009-03-01",10.067],
    ["2009-04-01",13.717],
    ["2009-05-01",19.169],
    ["2009-06-01",22.167],
    ["2009-07-01",24.366],
    ["2009-08-01",24.323],
    ["2009-09-01",21.627],
    ["2009-10-01",14.559],
    ["2009-11-01",11.741],
    ["2009-12-01",4.588],
    ["2010-01-01",4.107],
    ["2010-02-01",4.734],
    ["2010-03-01",9.946],
    ["2010-04-01",14.356],
    ["2010-05-01",18.384],
    ["2010-06-01",23.412],
    ["2010-07-01",25.272],
    ["2010-08-01",24.962],
    ["2010-09-01",22.054],
    ["2010-10-01",16.206],
    ["2010-11-01",10.359],
    ["2010-12-01",4.815],
    ["2011-01-01",3.859],
    ["2011-02-01",5.624],
    ["2011-03-01",10.163],
    ["2011-04-01",14.527],
    ["2011-05-01",17.829],
    ["2011-06-01",22.823],
    ["2011-07-01",25.805],
    ["2011-08-01",25.29],
    ["2011-09-01",21.667],
    ["2011-10-01",16.014],
    ["2011-11-01",10.935],
    ["2011-12-01",6.675],
    ["2012-01-01",6.797],
    ["2012-02-01",7.705],
    ["2012-03-01",13.024],
    ["2012-04-01",14.924],
    ["2012-05-01",19.959],
    ["2012-06-01",22.815],
    ["2012-07-01",25.674],
    ["2012-08-01",25.032],
    ["2012-09-01",21.757],
    ["2012-10-01",15.994],
    ["2012-11-01",10.608],
    ["2012-12-01",7.222],
    ["2013-01-01",5.43],
    ["2013-02-01",5.966],
    ["2013-03-01",9.071],
    ["2013-04-01",13.75],
    ["2013-05-01",18.643],
    ["2013-06-01",23.226],
    ["2013-07-01",24.925],
    ["2013-08-01",24.107],
    ["2013-09-01",22.339]
  ];

  const US_FORECAST = [
    ["2013-10-01",15.853],
    ["2013-11-01",null],
    ["2013-12-01",5.834],
    ["2014-01-01",5.239],
    ["2014-02-01",6.533],
    ["2014-03-01",9.814],
    ["2014-04-01",14.373],
    ["2014-05-01",18.759],
    ["2014-06-01",22.731],
    ["2014-07-01",24.818],
    ["2014-08-01",24.902],
    ["2014-09-01",21.687],
    ["2014-10-01",15.821],
    ["2014-11-01",10.572],
    ["2014-12-01",5.802],
    ["2015-01-01",5.207],
    ["2015-02-01",6.501],
    ["2015-03-01",9.782],
    ["2015-04-01",14.341],
    ["2015-05-01",18.727],
    ["2015-06-01",22.699],
    ["2015-07-01",24.787],
    ["2015-08-01",24.87],
    ["2015-09-01",21.655],
    ["2015-10-01",15.789],
    ["2015-11-01",10.54],
    ["2015-12-01",5.771],
    ["2016-01-01",5.175],
    ["2016-02-01",6.469],
    ["2016-03-01",9.75],
    ["2016-04-01",14.309],
    ["2016-05-01",18.695],
    ["2016-06-01",22.667],
    ["2016-07-01",24.755],
    ["2016-08-01",24.838],
    ["2016-09-01",21.623],
    ["2016-10-01",15.757],
    ["2016-11-01",10.508],
    ["2016-12-01",5.739],
    ["2017-01-01",5.143],
    ["2017-02-01",6.437],
    ["2017-03-01",9.718],
    ["2017-04-01",14.277],
    ["2017-05-01",18.663],
    ["2017-06-01",22.635],
    ["2017-07-01",24.723],
    ["2017-08-01",24.806],
    ["2017-09-01",21.591],
    ["2017-10-01",15.726],
    ["2017-11-01",10.476],
    ["2017-12-01",5.707],
    ["2018-01-01",5.111],
    ["2018-02-01",6.405],
    ["2018-03-01",9.686],
    ["2018-04-01",14.245],
    ["2018-05-01",18.632],
    ["2018-06-01",22.603],
    ["2018-07-01",24.691],
    ["2018-08-01",24.774],
    ["2018-09-01",21.56],
    ["2018-10-01",15.694],
    ["2018-11-01",10.444],
    ["2018-12-01",5.675],
    ["2019-01-01",5.079],
    ["2019-02-01",6.373],
    ["2019-03-01",9.654],
    ["2019-04-01",14.213],
    ["2019-05-01",18.6],
    ["2019-06-01",22.571],
    ["2019-07-01",24.659],
    ["2019-08-01",24.742],
    ["2019-09-01",21.528],
    ["2019-10-01",15.662],
    ["2019-11-01",10.412],
    ["2019-12-01",5.643],
    ["2020-01-01",5.048],
    ["2020-02-01",6.341],
    ["2020-03-01",9.623],
    ["2020-04-01",14.181],
    ["2020-05-01",18.568],
    ["2020-06-01",22.539],
    ["2020-07-01",24.627],
    ["2020-08-01",24.71],
    ["2020-09-01",21.496],
    ["2020-10-01",15.63],
    ["2020-11-01",10.38],
    ["2020-12-01",5.611],
    ["2021-01-01",5.016],
    ["2021-02-01",6.31],
    ["2021-03-01",9.591],
    ["2021-04-01",14.15],
    ["2021-05-01",18.536],
    ["2021-06-01",22.508],
    ["2021-07-01",24.595],
    ["2021-08-01",24.678],
    ["2021-09-01",21.464],
    ["2021-10-01",15.598],
    ["2021-11-01",10.349],
    ["2021-12-01",5.579],
    ["2022-01-01",4.984],
    ["2022-02-01",6.278],
    ["2022-03-01",9.559],
    ["2022-04-01",14.118],
    ["2022-05-01",18.504],
    ["2022-06-01",22.476],
    ["2022-07-01",24.564],
    ["2022-08-01",24.647],
    ["2022-09-01",21.432],
    ["2022-10-01",15.566],
    ["2022-11-01",10.317],
    ["2022-12-01",5.547],
    ["2023-01-01",4.952],
    ["2023-02-01",6.246],
    ["2023-03-01",9.527],
    ["2023-04-01",14.086],
    ["2023-05-01",18.472],
    ["2023-06-01",22.444],
    ["2023-07-01",24.532],
    ["2023-08-01",24.615],
    ["2023-09-01",21.4],
    ["2023-10-01",15.534],
    ["2023-11-01",10.285],
    ["2023-12-01",5.516],
    ["2024-01-01",4.92],
    ["2024-02-01",6.214],
    ["2024-03-01",9.495],
    ["2024-04-01",14.054],
    ["2024-05-01",18.44],
    ["2024-06-01",22.412],
    ["2024-07-01",24.5],
    ["2024-08-01",24.583],
    ["2024-09-01",21.368],
    ["2024-10-01",15.503],
    ["2024-11-01",10.253],
    ["2024-12-01",5.484],
    ["2025-01-01",4.888],
    ["2025-02-01",6.182],
    ["2025-03-01",9.463],
    ["2025-04-01",14.022],
    ["2025-05-01",18.409],
    ["2025-06-01",22.38],
    ["2025-07-01",24.468],
    ["2025-08-01",24.551],
    ["2025-09-01",21.337],
    ["2025-10-01",15.471],
    ["2025-11-01",10.221],
    ["2025-12-01",5.452],
    ["2026-01-01",4.856],
    ["2026-02-01",6.15],
    ["2026-03-01",9.431],
    ["2026-04-01",13.99],
    ["2026-05-01",18.377],
    ["2026-06-01",22.348],
    ["2026-07-01",24.436],
    ["2026-08-01",24.519],
    ["2026-09-01",21.305],
    ["2026-10-01",15.439],
    ["2026-11-01",10.189],
    ["2026-12-01",5.42],
    ["2027-01-01",4.825],
    ["2027-02-01",6.118],
    ["2027-03-01",9.399],
    ["2027-04-01",13.958],
    ["2027-05-01",18.345]
  ];

  const CA_HISTORY = [
    ["2000-02-01",-5.141],
    ["2000-03-01",1.513],
    ["2000-04-01",4.923],
    ["2000-05-01",11.291],
    ["2000-06-01",15.31],
    ["2000-07-01",17.781],
    ["2000-08-01",17.557],
    ["2000-09-01",13.08],
    ["2000-10-01",7.961],
    ["2000-11-01",0.594],
    ["2000-12-01",-9.212],
    ["2001-01-01",-6.022],
    ["2001-02-01",-7.435],
    ["2001-03-01",-1.85],
    ["2001-04-01",5.412],
    ["2001-05-01",12.569],
    ["2001-06-01",16.215],
    ["2001-07-01",18.11],
    ["2001-08-01",19.518],
    ["2001-09-01",14.252],
    ["2001-10-01",7.571],
    ["2001-11-01",3.855],
    ["2001-12-01",-2.498],
    ["2002-01-01",-4.81],
    ["2002-02-01",-4.223],
    ["2002-03-01",-3.785],
    ["2002-04-01",4.479],
    ["2002-05-01",9.361],
    ["2002-06-01",16.22],
    ["2002-07-01",19.743],
    ["2002-08-01",18.533],
    ["2002-09-01",15.395],
    ["2002-10-01",5.458],
    ["2002-11-01",0.764],
    ["2002-12-01",-4.034],
    ["2003-01-01",-9.506],
    ["2003-02-01",-9.304],
    ["2003-03-01",-2.81],
    ["2003-04-01",3.945],
    ["2003-05-01",10.909],
    ["2003-06-01",16.063],
    ["2003-07-01",18.942],
    ["2003-08-01",19.359],
    ["2003-09-01",14.515],
    ["2003-10-01",7.523],
    ["2003-11-01",0.478],
    ["2003-12-01",-3.811],
    ["2004-01-01",-11.773],
    ["2004-02-01",-5.903],
    ["2004-03-01",-0.067],
    ["2004-04-01",5.632],
    ["2004-05-01",10.886],
    ["2004-06-01",15.104],
    ["2004-07-01",18.546],
    ["2004-08-01",17.151],
    ["2004-09-01",14.347],
    ["2004-10-01",7.63],
    ["2004-11-01",2.093],
    ["2004-12-01",-5.655],
    ["2005-01-01",-9.585],
    ["2005-02-01",-5.596],
    ["2005-03-01",-2.233],
    ["2005-04-01",6.217],
    ["2005-05-01",10.558],
    ["2005-06-01",17.616],
    ["2005-07-01",19.521],
    ["2005-08-01",18.725],
    ["2005-09-01",14.944],
    ["2005-10-01",8.585],
    ["2005-11-01",2.092],
    ["2005-12-01",-5.067],
    ["2006-01-01",-2.828],
    ["2006-02-01",-6.377],
    ["2006-03-01",-1.421],
    ["2006-04-01",6.791],
    ["2006-05-01",12.393],
    ["2006-06-01",16.82],
    ["2006-07-01",20.202],
    ["2006-08-01",18.01],
    ["2006-09-01",13.61],
    ["2006-10-01",6.44],
    ["2006-11-01",1.583],
    ["2006-12-01",-2.005],
    ["2007-01-01",-6.317],
    ["2007-02-01",-9.42],
    ["2007-03-01",-1.16],
    ["2007-04-01",4.434],
    ["2007-05-01",11.869],
    ["2007-06-01",16.618],
    ["2007-07-01",18.974],
    ["2007-08-01",17.93],
    ["2007-09-01",14.386],
    ["2007-10-01",9.67],
    ["2007-11-01",0.377],
    ["2007-12-01",-6.198],
    ["2008-01-01",-6.464],
    ["2008-02-01",-7.234],
    ["2008-03-01",-3.183],
    ["2008-04-01",5.68],
    ["2008-05-01",10.326],
    ["2008-06-01",16.207],
    ["2008-07-01",18.694],
    ["2008-08-01",17.798],
    ["2008-09-01",14.091],
    ["2008-10-01",7.147],
    ["2008-11-01",1.705],
    ["2008-12-01",-7.556],
    ["2009-01-01",-10.732],
    ["2009-02-01",-6.582],
    ["2009-03-01",-2.457],
    ["2009-04-01",5.427],
    ["2009-05-01",10.713],
    ["2009-06-01",15.451],
    ["2009-07-01",17.478],
    ["2009-08-01",18.096],
    ["2009-09-01",14.791],
    ["2009-10-01",5.774],
    ["2009-11-01",3.692],
    ["2009-12-01",-6.816],
    ["2010-01-01",-6.256],
    ["2010-02-01",-5.168],
    ["2010-03-01",1.987],
    ["2010-04-01",7.582],
    ["2010-05-01",12.18],
    ["2010-06-01",15.924],
    ["2010-07-01",19.673],
    ["2010-08-01",18.701],
    ["2010-09-01",13.708],
    ["2010-10-01",8.11],
    ["2010-11-01",0.894],
    ["2010-12-01",-6.01],
    ["2011-01-01",-8.821],
    ["2011-02-01",-7.632],
    ["2011-03-01",-3.008],
    ["2011-04-01",4.419],
    ["2011-05-01",11.555],
    ["2011-06-01",15.873],
    ["2011-07-01",19.57],
    ["2011-08-01",18.643],
    ["2011-09-01",15.371],
    ["2011-10-01",8.385],
    ["2011-11-01",2.774],
    ["2011-12-01",-2.358],
    ["2012-01-01",-5.469],
    ["2012-02-01",-3.796],
    ["2012-03-01",2.813],
    ["2012-04-01",5.412],
    ["2012-05-01",12.859],
    ["2012-06-01",16.469],
    ["2012-07-01",20.06],
    ["2012-08-01",19.075],
    ["2012-09-01",14.335],
    ["2012-10-01",7.625],
    ["2012-11-01",0.176],
    ["2012-12-01",-4.306],
    ["2013-01-01",-6.953],
    ["2013-02-01",-5.841],
    ["2013-03-01",-2.119],
    ["2013-04-01",3.741],
    ["2013-05-01",12.736],
    ["2013-06-01",15.992],
    ["2013-07-01",19.281],
    ["2013-08-01",18.165],
    ["2013-09-01",14.713]
  ];

  const CA_FORECAST = [
    ["2013-01-01",-6.319],
    ["2013-02-01",-6.501],
    ["2013-03-01",-2.334],
    ["2013-04-01",5.087],
    ["2013-05-01",11.448],
    ["2013-06-01",16.632],
    ["2013-07-01",18.942],
    ["2013-08-01",18.964],
    ["2013-09-01",14.713],
    ["2013-10-01",7.487],
    ["2013-11-01",2.25],
    ["2013-12-01",-4.723],
    ["2014-01-01",-6.283],
    ["2014-02-01",-6.465],
    ["2014-03-01",-2.298],
    ["2014-04-01",5.123],
    ["2014-05-01",11.483],
    ["2014-06-01",16.668],
    ["2014-07-01",18.978],
    ["2014-08-01",18.999],
    ["2014-09-01",14.749],
    ["2014-10-01",7.522],
    ["2014-11-01",2.285],
    ["2014-12-01",-4.687],
    ["2015-01-01",-6.247],
    ["2015-02-01",-6.429],
    ["2015-03-01",-2.262],
    ["2015-04-01",5.159],
    ["2015-05-01",11.519],
    ["2015-06-01",16.704],
    ["2015-07-01",19.014],
    ["2015-08-01",19.035],
    ["2015-09-01",14.785],
    ["2015-10-01",7.558],
    ["2015-11-01",2.321],
    ["2015-12-01",-4.651],
    ["2016-01-01",-6.211],
    ["2016-02-01",-6.394],
    ["2016-03-01",-2.227],
    ["2016-04-01",5.194],
    ["2016-05-01",11.555],
    ["2016-06-01",16.739],
    ["2016-07-01",19.049],
    ["2016-08-01",19.071],
    ["2016-09-01",14.82],
    ["2016-10-01",7.594],
    ["2016-11-01",2.357],
    ["2016-12-01",-4.615],
    ["2017-01-01",-6.176],
    ["2017-02-01",-6.358],
    ["2017-03-01",-2.191],
    ["2017-04-01",5.23],
    ["2017-05-01",11.59],
    ["2017-06-01",16.775],
    ["2017-07-01",19.085],
    ["2017-08-01",19.106],
    ["2017-09-01",14.856],
    ["2017-10-01",7.629],
    ["2017-11-01",2.393],
    ["2017-12-01",-4.58],
    ["2018-01-01",-6.14],
    ["2018-02-01",-6.322],
    ["2018-03-01",-2.155],
    ["2018-04-01",5.266],
    ["2018-05-01",11.626],
    ["2018-06-01",16.811],
    ["2018-07-01",19.121],
    ["2018-08-01",19.142],
    ["2018-09-01",14.892],
    ["2018-10-01",7.665],
    ["2018-11-01",2.428],
    ["2018-12-01",-4.544],
    ["2019-01-01",-6.104],
    ["2019-02-01",-6.287],
    ["2019-03-01",-2.119],
    ["2019-04-01",5.301],
    ["2019-05-01",11.662],
    ["2019-06-01",16.846],
    ["2019-07-01",19.157],
    ["2019-08-01",19.178],
    ["2019-09-01",14.928],
    ["2019-10-01",7.701],
    ["2019-11-01",2.464],
    ["2019-12-01",-4.508],
    ["2020-01-01",-6.069],
    ["2020-02-01",-6.251],
    ["2020-03-01",-2.084],
    ["2020-04-01",5.337],
    ["2020-05-01",11.698],
    ["2020-06-01",16.882],
    ["2020-07-01",19.192],
    ["2020-08-01",19.214],
    ["2020-09-01",14.963],
    ["2020-10-01",7.737],
    ["2020-11-01",2.5],
    ["2020-12-01",-4.473],
    ["2021-01-01",-6.033],
    ["2021-02-01",-6.215],
    ["2021-03-01",-2.048],
    ["2021-04-01",5.373],
    ["2021-05-01",11.733],
    ["2021-06-01",16.918],
    ["2021-07-01",19.228],
    ["2021-08-01",19.249],
    ["2021-09-01",14.999],
    ["2021-10-01",7.772],
    ["2021-11-01",2.535],
    ["2021-12-01",-4.437],
    ["2022-01-01",-5.997],
    ["2022-02-01",-6.179],
    ["2022-03-01",-2.012],
    ["2022-04-01",5.409],
    ["2022-05-01",11.769],
    ["2022-06-01",16.954],
    ["2022-07-01",19.264],
    ["2022-08-01",19.285],
    ["2022-09-01",15.035],
    ["2022-10-01",7.808],
    ["2022-11-01",2.571],
    ["2022-12-01",-4.401],
    ["2023-01-01",-5.961],
    ["2023-02-01",-6.144],
    ["2023-03-01",-1.977],
    ["2023-04-01",5.444],
    ["2023-05-01",11.805],
    ["2023-06-01",16.989],
    ["2023-07-01",19.299],
    ["2023-08-01",19.321],
    ["2023-09-01",15.07],
    ["2023-10-01",7.844],
    ["2023-11-01",2.607],
    ["2023-12-01",-4.365],
    ["2024-01-01",-5.926],
    ["2024-02-01",-6.108],
    ["2024-03-01",-1.941],
    ["2024-04-01",5.48],
    ["2024-05-01",11.84],
    ["2024-06-01",17.025],
    ["2024-07-01",19.335],
    ["2024-08-01",19.356],
    ["2024-09-01",15.106],
    ["2024-10-01",7.879],
    ["2024-11-01",2.643],
    ["2024-12-01",-4.33],
    ["2025-01-01",-5.89],
    ["2025-02-01",-6.072],
    ["2025-03-01",-1.905],
    ["2025-04-01",5.516],
    ["2025-05-01",11.876],
    ["2025-06-01",17.061],
    ["2025-07-01",19.371],
    ["2025-08-01",19.392],
    ["2025-09-01",15.142],
    ["2025-10-01",7.915],
    ["2025-11-01",2.678],
    ["2025-12-01",-4.294],
    ["2026-01-01",-5.854],
    ["2026-02-01",-6.037],
    ["2026-03-01",-1.869],
    ["2026-04-01",5.551],
    ["2026-05-01",11.912],
    ["2026-06-01",17.096],
    ["2026-07-01",19.407],
    ["2026-08-01",19.428]
  ];

  const COUNTRIES = {
    us: { key: "us", label: "United States", factor: 1, history: US_HISTORY, forecast: US_FORECAST },
    canada: { key: "canada", label: "Canada", factor: 1.2, history: CA_HISTORY, forecast: CA_FORECAST },
  };

  const MONTHS = [
    { month: 1, name: "January", short: "Jan", season: "Winter", factor: 1.3 },
    { month: 2, name: "February", short: "Feb", season: "Winter", factor: 1.25 },
    { month: 3, name: "March", short: "Mar", season: "Spring", factor: 0.8 },
    { month: 4, name: "April", short: "Apr", season: "Spring", factor: 0.7 },
    { month: 5, name: "May", short: "May", season: "Spring", factor: 0.75 },
    { month: 6, name: "June", short: "Jun", season: "Summer", factor: 1.2 },
    { month: 7, name: "July", short: "Jul", season: "Summer", factor: 1.35 },
    { month: 8, name: "August", short: "Aug", season: "Summer", factor: 1.25 },
    { month: 9, name: "September", short: "Sep", season: "Fall", factor: 0.8 },
    { month: 10, name: "October", short: "Oct", season: "Fall", factor: 0.85 },
    { month: 11, name: "November", short: "Nov", season: "Fall", factor: 1 },
    { month: 12, name: "December", short: "Dec", season: "Winter", factor: 1.4 },
  ];

  const PARAMS = {
    noiseStdDev: 50,
    winterBaseCoeff: 5,
    summerBaseCoeff: 5,
    invBufferPct: 0.1,
    invBufferStdDev: 0.08,
  };

  const DEFAULT_STOCKOUT_COST = 15;
  const DEFAULT_HOLDING_COST = 3;
  const MONTE_CARLO_RUNS = 500;
  const SWEEP_TRIALS = 60;
  const BUFFER_LEVELS = [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.14, 0.16, 0.18, 0.2];

  /* ---------------------------------------------------------------- model */

  function toFahrenheit(celsius) {
    return celsius * 1.8 + 32;
  }

  function monthOf(iso) {
    return Number(iso.slice(5, 7));
  }

  function yearOf(iso) {
    return Number(iso.slice(0, 4));
  }

  /* The workbook's demand formulas, driven by one month's temperature.
     Winter apparel is gated off between March and August. */
  function demandFor(country, iso, celsius) {
    const tempF = toFahrenheit(celsius);
    const month = monthOf(iso);
    const seasonFactor = MONTHS[month - 1].factor;
    const scale = country.factor * seasonFactor;
    const winter =
      month >= 3 && month <= 8
        ? 0
        : Math.max(0, (100 - tempF) * PARAMS.winterBaseCoeff * scale);
    const summer = Math.max(0, (tempF - 50) * PARAMS.summerBaseCoeff * scale);
    return { month: month, tempC: celsius, tempF: tempF, winter: winter, summer: summer, total: winter + summer };
  }

  function buildSeries(country, rows) {
    return rows
      .filter(function (row) {
        return row[1] !== null;
      })
      .map(function (row) {
        const point = demandFor(country, row[0], row[1]);
        point.date = row[0];
        return point;
      });
  }

  const SERIES = {};
  Object.keys(COUNTRIES).forEach(function (key) {
    const country = COUNTRIES[key];
    SERIES[key] = {
      country: country,
      history: buildSeries(country, country.history),
      forecast: buildSeries(country, country.forecast),
      missing: country.forecast.filter(function (row) {
        return row[1] === null;
      }).length,
    };
  });

  function sum(list, pick) {
    return list.reduce(function (acc, item) {
      return acc + pick(item);
    }, 0);
  }

  function gaussian(mean, sd) {
    let u = 0;
    while (u === 0) {
      u = Math.random();
    }
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
  }

  /* Inventory is committed before demand is known, so the buffer draw stays random. */
  function runInventory(points, bufferPct) {
    let demand = 0;
    let inventory = 0;
    let sales = 0;
    let lost = 0;
    let excess = 0;
    for (let i = 0; i < points.length; i += 1) {
      const d = points[i].total;
      const inv = Math.max(0, d * (1 + gaussian(bufferPct, PARAMS.invBufferStdDev)));
      demand += d;
      inventory += inv;
      sales += Math.min(d, inv);
      lost += Math.max(0, d - inv);
      excess += Math.max(0, inv - d);
    }
    return {
      demand: demand,
      inventory: inventory,
      sales: sales,
      lostSales: lost,
      excessInventory: excess,
      fillRate: demand > 0 ? sales / demand : 1,
    };
  }

  function forecastPoints() {
    return SERIES.us.forecast.concat(SERIES.canada.forecast);
  }

  function costOf(totals, stockoutCost, holdingCost) {
    return totals.lostSales * stockoutCost + totals.excessInventory * holdingCost;
  }

  function bufferSweep(trials, stockoutCost, holdingCost) {
    const points = forecastPoints();
    const levels = BUFFER_LEVELS.map(function (buffer) {
      let cost = 0;
      for (let t = 0; t < trials; t += 1) {
        cost += costOf(runInventory(points, buffer), stockoutCost, holdingCost);
      }
      return { buffer: buffer, cost: cost / trials };
    });
    let best = levels[0];
    levels.forEach(function (level) {
      if (level.cost < best.cost) {
        best = level;
      }
    });
    return { levels: levels, best: best };
  }

  function percentile(sorted, p) {
    const index = (sorted.length - 1) * p;
    const low = Math.floor(index);
    const high = Math.ceil(index);
    return low === high ? sorted[low] : sorted[low] + (sorted[high] - sorted[low]) * (index - low);
  }

  function monteCarlo(runs, stockoutCost, holdingCost) {
    const points = forecastPoints();
    const fillRates = [];
    const costs = [];
    for (let i = 0; i < runs; i += 1) {
      const totals = runInventory(points, PARAMS.invBufferPct);
      fillRates.push(totals.fillRate);
      costs.push(costOf(totals, stockoutCost, holdingCost));
    }
    const asc = function (a, b) {
      return a - b;
    };
    fillRates.sort(asc);
    costs.sort(asc);
    return {
      runs: runs,
      fillRate: { min: fillRates[0], median: percentile(fillRates, 0.5), max: fillRates[fillRates.length - 1] },
      cost: { min: costs[0], median: percentile(costs, 0.5), max: costs[costs.length - 1] },
    };
  }

  /* ------------------------------------------------------------ rendering */

  const fmtUnits = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const fmtMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const fmtTemp = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function pct(value, digits) {
    return (value * 100).toFixed(typeof digits === "number" ? digits : 1) + "%";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function el(id) {
    return document.getElementById(id);
  }

  /* `scale` lets a chart share one baseline across several series, and lets a
     series containing negatives (temperature) measure from its floor rather than
     from zero, so -6C does not draw a bar longer than +5C. */
  function renderBars(container, items, scale) {
    if (!container) {
      return;
    }
    const floor = scale ? scale.min : 0;
    const ceiling = scale
      ? scale.max
      : items.reduce(function (acc, item) {
          return Math.max(acc, item.value);
        }, 0);
    const span = ceiling - floor;
    container.innerHTML = items
      .map(function (item) {
        const width = span > 0 ? ((item.value - floor) / span) * 100 : 0;
        return (
          '<div class="bar-row' + (item.highlight ? " is-best" : "") + '">' +
          '<span class="bar-label">' + escapeHtml(item.label) + "</span>" +
          '<div class="bar-track"><div class="bar-fill" style="width: ' + width.toFixed(1) + '%"></div></div>' +
          '<span class="bar-value">' + escapeHtml(item.display) + "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderRange(container, range, format) {
    if (!container) {
      return;
    }
    const span = range.max - range.min;
    const position = span > 0 ? ((range.median - range.min) / span) * 100 : 50;
    container.innerHTML =
      '<div class="range-track"><span class="range-marker range-base" style="left: ' +
      position.toFixed(1) + '%"><em>Median ' + escapeHtml(format(range.median)) + "</em></span></div>" +
      '<div class="range-ends"><span>Low ' + escapeHtml(format(range.min)) +
      "</span><span>High " + escapeHtml(format(range.max)) + "</span></div>";
  }

  /* Average by calendar month: the climatology and the seasonal demand shape. */
  function byMonth(points, pick) {
    return MONTHS.map(function (m) {
      const matching = points.filter(function (p) {
        return p.month === m.month;
      });
      return {
        month: m,
        value: matching.length ? sum(matching, pick) / matching.length : 0,
        count: matching.length,
      };
    });
  }

  function renderTemperature() {
    /* One shared scale across both countries, so the charts are comparable and
       Canada's sub-zero months read as short bars rather than long ones. */
    const all = [];
    ["us", "canada"].forEach(function (key) {
      byMonth(SERIES[key].forecast, function (p) { return p.tempC; }).forEach(function (b) {
        all.push(b.value);
      });
      byMonth(SERIES[key].history, function (p) { return p.tempC; }).forEach(function (b) {
        all.push(b.value);
      });
    });
    const scale = { min: Math.floor(Math.min.apply(null, all)) - 1, max: Math.ceil(Math.max.apply(null, all)) };

    ["us", "canada"].forEach(function (key) {
      const s = SERIES[key];
      const hist = byMonth(s.history, function (p) { return p.tempC; });
      const fore = byMonth(s.forecast, function (p) { return p.tempC; });
      renderBars(
        el("temp-bars-" + key),
        MONTHS.map(function (m, i) {
          return {
            label: m.short + " (history " + fmtTemp.format(hist[i].value) + "°C)",
            value: fore[i].value,
            display: "forecast " + fmtTemp.format(fore[i].value) + "°C",
          };
        }),
        scale
      );
    });
  }

  function renderDemand() {
    ["us", "canada"].forEach(function (key) {
      const s = SERIES[key];
      const fore = byMonth(s.forecast, function (p) { return p.total; });
      renderBars(
        el("demand-bars-" + key),
        MONTHS.map(function (m, i) {
          return {
            label: m.name + " (×" + m.factor + ")",
            value: fore[i].value,
            display: fmtUnits.format(fore[i].value) + " units",
          };
        })
      );
    });
  }

  function renderHeadline() {
    const us = SERIES.us;
    const ca = SERIES.canada;
    const usTotal = sum(us.forecast, function (p) { return p.total; });
    const caTotal = sum(ca.forecast, function (p) { return p.total; });
    const pills = [
      "2 countries",
      us.history.length + " months of Berkeley Earth history",
      us.forecast.length + ca.forecast.length + " forecast months",
      "US forecast demand " + fmtUnits.format(usTotal) + " units",
      "Canada forecast demand " + fmtUnits.format(caTotal) + " units",
      "Canada runs " + pct(caTotal / usTotal - 1, 0) + " above the US",
    ];
    const container = el("headline-stats");
    if (container) {
      container.innerHTML = pills
        .map(function (t) { return '<span class="stat-pill">' + escapeHtml(t) + "</span>"; })
        .join("");
    }

    const split = el("demand-split");
    if (split) {
      const usWinter = sum(us.forecast, function (p) { return p.winter; });
      const usSummer = sum(us.forecast, function (p) { return p.summer; });
      const caWinter = sum(ca.forecast, function (p) { return p.winter; });
      const caSummer = sum(ca.forecast, function (p) { return p.summer; });
      renderBars(split, [
        { label: "United States, winter apparel", value: usWinter, display: fmtUnits.format(usWinter) },
        { label: "United States, summer apparel", value: usSummer, display: fmtUnits.format(usSummer) },
        { label: "Canada, winter apparel", value: caWinter, display: fmtUnits.format(caWinter) },
        { label: "Canada, summer apparel", value: caSummer, display: fmtUnits.format(caSummer) },
      ]);
    }
  }

  function readCost(input, fallback) {
    if (!input) {
      return fallback;
    }
    const value = Number.parseFloat(input.value);
    if (!Number.isFinite(value) || value <= 0) {
      return fallback;
    }
    return Math.min(value, 1000);
  }

  function renderSolver() {
    const stockoutCost = readCost(el("cost-stockout"), DEFAULT_STOCKOUT_COST);
    const holdingCost = readCost(el("cost-holding"), DEFAULT_HOLDING_COST);
    const sweep = bufferSweep(SWEEP_TRIALS, stockoutCost, holdingCost);

    renderBars(
      el("solver-bars"),
      sweep.levels.map(function (level) {
        return {
          label: pct(level.buffer, 0) + " buffer",
          value: level.cost,
          display: fmtMoney.format(level.cost),
          highlight: level === sweep.best,
        };
      })
    );

    const headline = el("solver-headline");
    if (headline) {
      const current = sweep.levels.filter(function (l) {
        return Math.abs(l.buffer - PARAMS.invBufferPct) < 1e-9;
      })[0];
      const label = pct(sweep.best.buffer, 0);
      const article = /^(8|18)%$/.test(label) ? "an" : "a";
      const isDefault = sweep.best === current;
      headline.innerHTML =
        "At " + escapeHtml(fmtMoney.format(stockoutCost)) + " per unit of lost sales and " +
        escapeHtml(fmtMoney.format(holdingCost)) + " per unit held, expected cost across both " +
        "countries' forecast horizons is lowest at " + article + " <strong>" + escapeHtml(label) +
        "</strong> buffer, at " + escapeHtml(fmtMoney.format(sweep.best.cost)) + ". " +
        (isDefault
          ? "That is the setting the workbook already uses."
          : "The workbook's 10% setting costs " +
            escapeHtml(fmtMoney.format(current ? current.cost : 0)) + ", " +
            escapeHtml(fmtMoney.format(Math.abs((current ? current.cost : 0) - sweep.best.cost))) +
            " more.");
    }
  }

  let monteCarloTimer = null;
  let solverTimer = null;

  function runMonteCarlo() {
    const stockoutCost = readCost(el("cost-stockout"), DEFAULT_STOCKOUT_COST);
    const holdingCost = readCost(el("cost-holding"), DEFAULT_HOLDING_COST);
    const result = monteCarlo(MONTE_CARLO_RUNS, stockoutCost, holdingCost);

    renderRange(el("mc-fill-rate"), result.fillRate, function (v) { return pct(v, 2); });
    renderRange(el("mc-cost"), result.cost, function (v) { return fmtMoney.format(v); });

    const note = el("monte-carlo-note");
    if (note) {
      note.textContent =
        "Across " + result.runs + " runs of the stocking decision at the workbook's 10% buffer, " +
        "fill rate ranges from " + pct(result.fillRate.min, 2) + " to " + pct(result.fillRate.max, 2) +
        ", and total cost from " + fmtMoney.format(result.cost.min) + " to " +
        fmtMoney.format(result.cost.max) + ".";
    }
  }

  function scheduleMonteCarlo() {
    ["mc-fill-rate", "mc-cost"].forEach(function (id) {
      const node = el(id);
      if (node) {
        node.innerHTML = '<p class="viz-meta">Simulating…</p>';
      }
    });
    window.clearTimeout(monteCarloTimer);
    monteCarloTimer = window.setTimeout(runMonteCarlo, 30);
  }

  function init() {
    if (!el("headline-stats")) {
      return;
    }

    renderHeadline();
    renderTemperature();
    renderDemand();
    renderSolver();
    scheduleMonteCarlo();

    ["cost-stockout", "cost-holding"].forEach(function (id) {
      const input = el(id);
      if (!input) {
        return;
      }
      input.addEventListener("input", function () {
        window.clearTimeout(solverTimer);
        solverTimer = window.setTimeout(function () {
          renderSolver();
          scheduleMonteCarlo();
        }, 200);
      });
    });

    const rerun = el("rerun-inventory");
    if (rerun) {
      rerun.addEventListener("click", function () {
        renderSolver();
        scheduleMonteCarlo();
      });
    }
  }

  window.apparelModel = {
    SERIES: SERIES,
    demandFor: demandFor,
    runInventory: runInventory,
    bufferSweep: bufferSweep,
    monteCarlo: monteCarlo,
    costOf: costOf,
    forecastPoints: forecastPoints,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
