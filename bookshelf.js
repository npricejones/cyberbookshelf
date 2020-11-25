var parseDay = d3.timeParse("%Y/%m/%d")
var parseYear = d3.timeParse("%Y")
d3.csv("goodreads_small.csv")
  .row(function (d) {
    var pointobj = {}
    authorlist = [d['Author'], d['Additional Authors']]
    // Strings
    pointobj['author'] = d['Author l-f']
    if (d['Additional Authors']) {
      pointobj['authors'] = authorlist.join(', ')
    } else {
      pointobj['authors'] = d['Author']
    }
    pointobj['coauthor'] = d['Additional Authors']

    // Extract series information from title
    var title = d['Title']
    var basetitle = title.split('(')[0]
    pointobj['title'] = basetitle
    var series = title.split('(')[1]
    if (series) {
      series = series.split(')')[0].split('#')
      pointobj['series'] = series[0].split(',')[0].trim()
      pointobj['seriesNum'] = Number(series[1].trim())
      pointobj['seriesAll'] = [pointobj['series'], pointobj['seriesNum']].join(', ')
    } else {
      pointobj['series'] = undefined
      pointobj['seriesNum'] = undefined
    }

    console.log(pointobj['series'], pointobj['seriesAll'])

    pointobj['publisher'] = d['Publisher']
    pointobj['binding'] = d['Binding']
    pointobj['status'] = d['Exclusive Shelf']
    // Numbers
    pointobj['numPage'] = Number(d['Number of Pages'])
    pointobj['ISBN'] = Number(d['ISBN'])
    pointobj['ISBN13'] = Number(d['ISBN13'])
    pointobj['GRBookID'] = Number(d['Book Id'])
    pointobj['rating'] = Number(d['My Rating'])
    pointobj['meanRating'] = Number(d['Average Rating'])
    // Dates
    pointobj['pubYear'] = parseYear(d['Original Publication Year'])
    pointobj['edYear'] = parseYear(d['Year Published'])
    pointobj['dateRead'] = parseDay(d['Date Read'])
    pointobj['dateAdded'] = parseDay(d['Date Added'])
    return pointobj
  })
  .get(function (error, data) {

    // need to write a handler for books with no page count

    data = data.slice().sort(function (a, b) {
      d3.ascending(a.author, b.author) || d3.ascending(a.seriesAll, b.seriesAll)
    })

    var numberbooks = data.length
    var numberpages = d3.sum(data, d => d.numPage)

    var twidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth
    var theight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight
    var margin = {
      left: 50,
      right: 50,
      top: 40,
      bottom: 0
    }

    var swidth = 300
    var sheight = 100
    var shelfThickness = sheight * 0.07
    var caseThickness = sheight * 0.1

    var numshelf = Math.floor((theight - margin.top - margin.bottom) / sheight)

    console.log(theight, sheight, numshelf)

    var svg = d3.select("body").append("svg")
      .attr("height", "100%")
      .attr("width", "100%");

    function makeshelf(xstart) {
      // Create a shelf that has width swidth, with a number of shelves equal to numshelf, each sheight high
      // Return the starting points for each shelf as well as the right edge of the shelf

      var shelfProperties = [];

      //iteratively create each shelf
      var y0 = margin.top + caseThickness;
      var shelfStarts = [];
      var i;
      for (i = 0; i < numshelf; i++) {
        // create shadow for background
        var shelfBack = {
          "name": "background",
          "x": xstart + (0.5 * caseThickness),
          "y": y0 - (shelfThickness * 0.5),
          "height": sheight + shelfThickness,
          "width": swidth + caseThickness
        }
        // create actual shelf properties
        var shelfProp = {
          "name": "shelf",
          "ind": i,
          "x": xstart + caseThickness,
          "y": y0 + sheight,
          "height": shelfThickness,
          "width": swidth
        };
        shelfStarts.push({
          "x": xstart + caseThickness,
          "y": y0 + sheight
        });
        // send them to the front
        shelfProperties.unshift(shelfBack);
        shelfProperties.push(shelfProp);
        y0 += sheight;
      }

      var xleft = xstart
      var xright = xleft + caseThickness + swidth
      var ytop = margin.top
      var ybottom = y0

      var caseProperties = [{
        "name": "top",
        "x": xleft,
        "y": ytop,
        "height": caseThickness,
        "width": swidth + (caseThickness * 2),
      }, {
        "name": "bottom",
        "x": xleft,
        "y": ybottom,
        "height": caseThickness,
        "width": swidth + (caseThickness * 2),
      }, {
        "name": "left",
        "x": xleft,
        "y": ytop,
        "height": y0 - ytop,
        "width": caseThickness,
      }, {
        "name": "right",
        "x": xright,
        "y": ytop,
        "height": y0 - ytop,
        "width": caseThickness,
      }];

      var bounds = {
        "xinner": xleft,
        "xouter": xright + caseThickness,
        "yupper": ytop,
        "ylower": ybottom + caseThickness
      }

      shelfProperties = shelfProperties.concat(caseProperties);

      svg.selectAll("rect.x" + xstart)
        .data(shelfProperties)
        .enter().append("rect")
        .attr("height", function (d, i) {
          return d.height;
        })
        .attr("width", function (d, i) {
          return d.width;
        })
        .attr("x", function (d, i) {
          return d.x;
        })
        .attr("y", function (d, i) {
          return d.y;
        })
        .attr("class", function (d, i) {
          return "case x" + xstart + " " + d.name;
        });
      return [bounds, shelfStarts];
    }

    // loop to fill shelves

    shelfInfo = makeshelf(margin.top + 0)

    bounds = shelfInfo[0]
    shelfStarts = shelfInfo[1]

    shelfInfo2 = makeshelf(bounds.xouter + 10)

    console.log(bounds, shelfStarts)


    //calculate the number of bookcase
    //~20 books per shelf, 5 shelves per bookcase
    //stretch goal - add bookends?

    //ASSUME INFINITE SCROLL BOOKCASES


    //
    //
    // // define for each shelf
    // var xScale = d3.scaleLinear()
    //   .domain([0, numberpages])
    //   .range([0, width])
    // var yScale = d3.scaleLinear()
    //   .domain([0, 100])
    //   .range([height, 0])
    //
    // vertices = []
    // var x0 = 0
    // var y0 = 0
    // var y1 = sheight * 0.85
    // var gap = 7
    //
    // // loop over books and append their vertices
    // var i;
    // for (i = 0; i < numberbooks; i++) {
    //   bottomL = [xScale(x0), yScale(y0)]
    //   bottomR = [xScale(x0 + data[i].numPage), yScale(y0)]
    //   topR = [xScale(x0 + data[i].numPage), yScale(y1)]
    //   topL = [xScale(x0), yScale(y1)]
    //   bookshape = [bottomL, bottomR, topR, topL]
    //   x0 += data[i].numPage + gap
    //   vertices.push(bookshape)
    // }
    //
    // // // create book tooltip
    // //
    // var tooltip = d3.select("body")
    //   .append("div")
    //   .style("opacity", "0")
    //   .style("position", "absolute")
    // //
    // // // create book object
    // //
    //
    // var shelf = svg.append("g")
    // shelf.append("g").attr("class", "books")
    //   .selectAll("path")
    //   .data(vertices)
    //   .enter().append("path")
    //   .attr("d", function (d) {
    //     return "M" + d.join("L") + "Z"
    //   })
    //   .on("mousemove", function (d, i) {
    //     tooltip.style("opacity", "1")
    //       .style("left", d[2][0] + "px")
    //       .style("top", d[2][1] + "px")
    //
    //     tooltip.html("Author(s): " + data[i].authors + "<br>Title: " + data[i].title)
    //   })


  })
