var parseDay = d3.timeParse("%Y/%m/%d")
var parseYear = d3.timeParse("%Y")
d3.csv("goodreads_library_export.csv")
  .row(function (d) {
    var pointobj = {}
    authorlist = [d['Author']].concat(d['Additional Authors'].split(', '))
    // Strings

    pointobj['author'] = d['Author l-f']
    if (d['Additional Authors']) {
      pointobj['authors'] = authorlist.join(', ')
      var firstAuthors = authorlist.slice(0, 2)
      pointobj['displayAuthors'] = firstAuthors.join(', ') + ", et al."
    } else {
      pointobj['authors'] = d['Author']
      pointobj['displayAuthors'] = d['Author']
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
      left: 100,
      right: 100,
      top: 40,
      bottom: 0
    }


    // ideally should be dynamic, but depends on aspect ratio
    var swidth = 300
    var sheight = 100
    var shelfThickness = sheight * 0.07
    var caseThickness = sheight * 0.1
    // loop to fill shelves
    var caseGap = 10
    var bookGap = 2
    // define a standard height for the books
    var bheight = 0.75 * sheight
    // define a linear factor to convert number of pages to pixel space
    // start with 0.01
    var pg2px = 0.05

    // approximate the total number of cases needed

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



    // Create first book shelf,
    var currentCase = makeshelf(margin.left + 0);
    var caseBounds = [currentCase[0]];
    var caseShelves = [currentCase[1]];

    var caseInd = 0;
    var totalCase = 0;

    // Create as many more bookshelves as needed
    // Break out if the next case would put us beyond the bounds of page
    while ((caseBounds[caseInd].xouter + swidth + (caseThickness * 2)) < twidth - margin.right) {
      currentCase = makeshelf(caseBounds[caseInd].xouter + caseGap);
      caseBounds.push(currentCase[0]);
      caseShelves.push(currentCase[1]);
      totalCase += 1;
      caseInd += 1;
    };


    var tooltip = d3.select("body")
      .append("div")
      .style("opacity", "0")
      .style("position", "absolute")

    var bookGroup = svg.append("g")

    function shelveBooks(bookInd) {
      // remove all extant books

      bookGroup.selectAll(".book").remove()

      caseInd = 0
      var shelfInd = 0
      var x0 = caseShelves[caseInd][shelfInd].x + bookGap
      var y0 = caseShelves[caseInd][shelfInd].y - 1.1

      var vertices = []

      for (i = bookInd; i < numberbooks; i++) {
        console.log(bookInd)
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
              break;
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
        vertices.push(bookshape)
      }

      bookGroup.selectAll("path.book")
        .data(vertices)
        .enter().append("path")
        .attr("d", function (d) {
          return "M" + d.join("L") + "Z"
        })
        .attr("class", function (d, i) {
          return "book " + data[i].status;
        })
        .on("mousemove", function (d, i) {
          tooltip.style("opacity", "1")
            .style("left", d[2][0] + "px")
            .style("top", d[2][1] + "px")
          tooltip.html(data[i + bookInd].title + "<br>by: " + data[i + bookInd].displayAuthors)
        })
      return i;
    }

    // Populate first shelf
    var casePosition = 0
    var firstBook = [0]
    bookInd = shelveBooks(firstBook[casePosition])

    // Add scroll buttons

    var leftButtonx = margin.left / 2;
    var rightButtonx = caseBounds[caseInd].xouter + leftButtonx;
    var leftButtony = ((caseBounds[0].ylower - caseBounds[0].yupper) / 2) + caseBounds[0].yupper;
    var rightButtony = leftButtony;

    var buttons = [{
      'cx': leftButtonx,
      'cy': leftButtony,
      'direction': 'left'
    }, {
      'cx': rightButtonx,
      'cy': rightButtony,
      'direction': 'right'
    }];


    var buttonGroup = svg.append("g")

    // button background
    buttonGroup.selectAll("circle.button")
      .data(buttons)
      .enter().append("circle")
      .attr("cx", function (d, i) {
        return d.cx;
      })
      .attr("cy", function (d, i) {
        return d.cy;
      })
      .attr("r", 25)
      .attr("class", function (d, i) {
        return "button " + d.direction;
      })


    // half opening angle of the arrow
    var angle = 32 * Math.PI / 180 //radians

    // general line functions
    function line(x, x0, y0, angle) {
      var m = Math.tan(angle)
      return m * (x - x0) + y0;
    }

    function invertline(y, x0, y0, angle) {
      var m = Math.tan(angle)
      return ((y - y0) / m) + x0;
    }

    // arrow properties
    var awidth = 20
    var athick = 7
    var abuffer = 3

    // center the arrows
    xstartL = buttons[0].cx - 1.2 * (awidth / 2)
    ystartL = buttons[0].cy

    xstartR = buttons[1].cx + 1.2 * (awidth / 2)
    ystartR = buttons[1].cy

    // create arrow vertices
    var arrows = [
      [
        [xstartL, ystartL],
        [xstartL + awidth, line(xstartL + awidth, xstartL, ystartL, angle)],
        [xstartL + awidth, line(xstartL + awidth, xstartL, ystartL - athick, angle)],
        [invertline(ystartL, xstartL, ystartL - athick, angle), ystartL],
        [xstartL + awidth, line(xstartL + awidth, xstartL, ystartL + athick, -angle)],
        [xstartL + awidth, line(xstartL + awidth, xstartL, ystartL, -angle)],
        [xstartL, ystartL]
      ], //left arrow
      [
        [xstartR, ystartR],
        [xstartR - awidth, line(xstartR - awidth, xstartR, ystartR, -angle)],
        [xstartR - awidth, line(xstartR - awidth, xstartR, ystartR - athick, -angle)],
        [invertline(ystartR, xstartR, ystartR - athick, -angle), ystartR],
        [xstartR - awidth, line(xstartR - awidth, xstartR, ystartR + athick, angle)],
        [xstartR - awidth, line(xstartR - awidth, xstartR, ystartR, angle)],
        [xstartR, ystartR]
      ] // right arrow
    ]

    // draw the arrows
    buttonGroup.selectAll("path.button")
      .data(arrows)
      .enter().append("path")
      .attr("d", function (d) {
        return "M" + d.join("L") + "Z"
      })
      .attr("class", function (d, i) {
        return "button " + buttons[i].direction;
      })


    // update button properties
    buttonGroup.selectAll(".right")
      .classed("active", true)
    buttonGroup.selectAll(".left")
      .classed("inactive", true)

    //extract styles from css
    var fake_div = d3.select('body')
      .append('div')
      .attr('class', 'button active')
      .style('display', 'none')
    activeFill = fake_div.style('fill');
    activeStroke = fake_div.style('stroke');
    activeWidth = fake_div.style('stroke-width');

    fake_div.remove();

    var fake_div = d3.select('body')
      .append('div')
      .attr('class', 'button inactive')
      .style('display', 'none')
    inactiveFill = fake_div.style('fill');
    inactiveStroke = fake_div.style('stroke');
    inactiveWidth = fake_div.style('stroke-width');

    fake_div.remove();

    var buttonDuration = 150;
    var buttonDelay = 0;

    var fake_div = d3.select('body')
      .append('div')
      .attr('class', 'button clicked')
      .style('display', 'none')
    clickedFill = fake_div.style('fill');
    clickedStroke = fake_div.style('stroke');
    clickedWidth = fake_div.style('stroke-width');

    fake_div.remove();

    function moveRight() {
      if (bookInd < numberbooks) {
        casePosition = casePosition + 1
        firstBook.push(bookInd)
      }
      bookInd = shelveBooks(firstBook[casePosition])
      if (bookInd > 0) {
        buttonGroup.selectAll(".left")
          .classed("inactive", false)
          .classed("active", true)
          .style("fill", activeFill)
          .style("stroke", activeStroke)
          .style("stroke-width", activeWidth)
      } else {
        buttonGroup.selectAll(".left")
          .classed("active", false)
          .classed("inactive", true)
          .style("fill", inactiveFill)
          .style("stroke", inactiveStroke)
          .style("stroke-width", inactiveWidth)
      }
      if (bookInd < numberbooks) {
        buttonGroup.selectAll(".right")
          .classed("inactive", false)
          .classed("active", true)
          .transition()
          .duration(buttonDuration)
          .delay(buttonDelay)
          .style("fill", clickedFill)
          .style("stroke", clickedStroke)
          .style("stroke-width", clickedWidth)
          .transition()
          .duration(buttonDuration)
          .delay(buttonDelay)
          .style("fill", activeFill)
          .style("stroke", activeStroke)
          .style("stroke-width", activeWidth)

      } else {
        if (buttonGroup.selectAll(".right").classed("active")) {
          buttonGroup.selectAll(".right")
            .classed("active", false)
            .classed("inactive", true)
            .transition()
            .duration(buttonDuration)
            .delay(buttonDelay)
            .style("fill", clickedFill)
            .style("stroke", clickedStroke)
            .style("stroke-width", clickedWidth)
            .transition()
            .duration(buttonDuration)
            .delay(buttonDelay)
            .style("fill", inactiveFill)
            .style("stroke", inactiveStroke)
            .style("stroke-width", inactiveWidth)
        } else {
          buttonGroup.selectAll(".right")
            .classed("active", false)
            .classed("inactive", true)
            .style("fill", inactiveFill)
            .style("stroke", inactiveStroke)
            .style("stroke-width", inactiveWidth)
        }
      }
    }

    function moveLeft() {
      casePosition = d3.max([0, casePosition - 1])
      bookInd = shelveBooks(firstBook[casePosition])
      if (firstBook[casePosition] > 0) {
        buttonGroup.selectAll(".left")
          .classed("inactive", false)
          .classed("active", true)
          .transition()
          .duration(buttonDuration)
          .delay(buttonDelay)
          .style("fill", clickedFill)
          .style("stroke", clickedStroke)
          .style("stroke-width", clickedWidth)
          .transition()
          .duration(buttonDuration)
          .delay(buttonDelay)
          .style("fill", activeFill)
          .style("stroke", activeStroke)
          .style("stroke-width", activeWidth)
      } else {
        if (buttonGroup.selectAll(".left").classed("active")) {
          buttonGroup.selectAll(".left")
            .classed("active", false)
            .classed("inactive", true)
            .transition()
            .duration(buttonDuration)
            .delay(buttonDelay)
            .style("fill", clickedFill)
            .style("stroke", clickedStroke)
            .style("stroke-width", clickedWidth)
            .transition()
            .duration(buttonDuration)
            .delay(buttonDelay)
            .style("fill", inactiveFill)
            .style("stroke", inactiveStroke)
            .style("stroke-width", inactiveWidth)
        } else {
          buttonGroup.selectAll(".left")
            .classed("active", false)
            .classed("inactive", true)
            .style("fill", inactiveFill)
            .style("stroke", inactiveStroke)
            .style("stroke-width", inactiveWidth)
        }
      }
      if (bookInd < numberbooks) {
        buttonGroup.selectAll(".right")
          .classed("inactive", false)
          .classed("active", true)
          .style("fill", activeFill)
          .style("stroke", activeStroke)
          .style("stroke-width", activeWidth)
      } else {
        buttonGroup.selectAll(".right")
          .classed("active", false)
          .classed("inactive", true)
          .style("fill", inactiveFill)
          .style("stroke", inactiveStroke)
          .style("stroke-width", inactiveWidth)
      }
    }

    buttonGroup.selectAll(".right")
      .on("click", moveRight)

    buttonGroup.selectAll(".left")
      .on("click", moveLeft)

    // by default, arrow keys navigate shelves, can toggle between
    var browseShelf = -1
    d3.select("body")
      .on("keydown", function () {
        //toggle between shelf and book browsing
        if (d3.event.keyCode === 13) {
          browseShelf = -browseShelf
        }
        if (d3.event.keyCode === 27) {
          browseShelf = -1
        }
        if ((d3.event.keyCode === 39 || d3.event.keyCode === 40) && (browseShelf === -1)) {
          moveRight();
        }
        if ((d3.event.keyCode === 37 || d3.event.keyCode === 38) && (browseShelf === -1)) {
          moveLeft();
        }
      })
    // add scroll tracking?


  })
