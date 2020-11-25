var parseDay = d3.timeParse("%Y/%m/%d")
var parseYear = d3.timeParse("%Y")
d3.csv("goodreads_library_export.csv")
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
      return d3.ascending(a.author, b.author) || d3.ascending(a.seriesAll, b.seriesAll)
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


    // ideally should be dynamic, but depends on aspect ratio
    var swidth = 300
    var sheight = 100
    var shelfThickness = sheight * 0.07
    var caseThickness = sheight * 0.1

    var numshelf = Math.floor((theight - margin.top - margin.bottom) / sheight)

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
    var caseGap = 10
    var bookGap = 2
    // define a linear factor to convert number of pages to pixel space
    // start with 0.01
    var pg2px = 0.05
    // define a standard height for the books
    var bheight = 0.75 * sheight

    var currentCase = makeshelf(margin.top + 0)
    var caseBounds = [currentCase[0]]
    var caseShelves = [currentCase[1]]
    var caseInd = 0
    var totalCase = 0

    var shelfInd = 0
    var x0 = caseShelves[caseInd][shelfInd].x + bookGap
    var y0 = caseShelves[caseInd][shelfInd].y - 1.1

    var vertices = []

    var opacity = 1

    var i;
    for (i = 0; i < numberbooks; i++) {
      var booklength = data[i].numPage * pg2px
      if ((x0 + booklength) > (caseShelves[caseInd][shelfInd].x + swidth - bookGap)) {
        // If shelf is full, move to the next shelf in the case, or if there
        // are no shelves, move to the next case
        if (shelfInd < caseShelves[caseInd].length - 1) {
          shelfInd += 1
          x0 = caseShelves[caseInd][shelfInd].x + bookGap
          y0 = caseShelves[caseInd][shelfInd].y - 1.1
        } else {
          // Break out if the next case would put us beyond the bounds of page
          if ((caseBounds[caseInd].xouter + swidth + caseThickness * 2) > twidth) {
            totalCase += 1
            caseInd = 0
            shelfInd = 0
            x0 = caseShelves[caseInd][shelfInd].x + bookGap
            y0 = caseShelves[caseInd][shelfInd].y - 1.1
            opacity = 0
            // Otherwise create a new shelf
          } else {
            currentCase = makeshelf(caseBounds[caseInd].xouter + caseGap)
            totalCase += 1
            caseInd += 1
            caseBounds.push(currentCase[0])
            caseShelves.push(currentCase[1])
            shelfInd = 0
            x0 = caseShelves[caseInd][shelfInd].x + bookGap
            y0 = caseShelves[caseInd][shelfInd].y - 1.1
          }
        }
      }
      // Create bounds of books
      bottomL = [x0, y0]
      bottomR = [x0 + booklength, y0]
      topR = [x0 + booklength, y0 - bheight]
      topL = [x0, y0 - bheight]
      bookshape = [bottomL, bottomR, topR, topL]
      x0 += booklength + bookGap
      data[i]['opacity'] = opacity
      data[i]['case'] = totalCase
      vertices.push(bookshape)
    }

    var tooltip = d3.select("body")
      .append("div")
      .style("opacity", "0")
      .style("position", "absolute")

    svg.selectAll("path")
      .data(vertices)
      .enter().append("path")
      .attr("d", function (d) {
        return "M" + d.join("L") + "Z"
      })
      .attr("class", function (d, i) {
        return "book " + data[i].status + " case" + data[i].case+" visible" + data[i].opacity;
      })
      .style("opacity", function (d, i) {
        return data[i].opacity;
      })

    svg.selectAll(".visible1")
      .data(vertices)
      .on("mousemove", function (d, i) {
        tooltip.style("opacity", "1")
          .style("left", d[2][0] + "px")
          .style("top", d[2][1] + "px")
        tooltip.html(data[i].title + "<br>by: " + data[i].authors)
      })


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
    //
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
