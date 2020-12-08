// Create parsers for date formats of interest
var parseDay = d3.timeParse("%Y/%m/%d")
var parseYear = d3.timeParse("%Y")
// Define default keys by which to do secondary sort of library (priority order)
var secondaryKeys = ['author', 'seriesAll', 'pubYear']

// Properties of bookshelf
/** @todo make this dynamic*/
var swidth = 300 // shelf width
var sheight = 100 // shelf height
var shelfThickness = sheight * 0.07 // thickness of the wood of the shelf
var bookGap = 2 // gap between books
var caseThickness = sheight * 0.1 // thickness of the wood of the case
var caseGap = 10 // gap between bookshelves

// define a standard height for the books
/** @todo make this vary with some property of the book*/
var bheight = 0.75 * sheight
// define a linear factor to convert number of pages to pixel space
var pg2px = 0.05

// Get initial properties of window
var twidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth
var theight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight
var margin = {
  left: 100,
  right: 100,
  top: 30,
  bottom: 30
}

// general line functions
function line(x, x0, y0, angle) {
  var m = Math.tan(angle)
  return m * (x - x0) + y0;
}

function invertline(y, x0, y0, angle) {
  var m = Math.tan(angle)
  return ((y - y0) / m) + x0;
}

//extract styles from css
var fake_div = d3.select('body')
  .append('div')
  .attr('class', 'button active')
  .style('display', 'none')
var activeFill = fake_div.style('fill');
var activeStroke = fake_div.style('stroke');
var activeWidth = fake_div.style('stroke-width');
var activeOpacity = fake_div.style('opacity')
fake_div.remove();

var fake_div = d3.select('body')
  .append('div')
  .attr('class', 'button inactive')
  .style('display', 'none')
var inactiveFill = fake_div.style('fill');
var inactiveStroke = fake_div.style('stroke');
var inactiveWidth = fake_div.style('stroke-width');
var inactiveOpacity = fake_div.style('opacity')
fake_div.remove();

var fake_div = d3.select('body')
  .append('div')
  .attr('class', 'button clicked')
  .style('display', 'none')
var clickedFill = fake_div.style('fill');
var clickedStroke = fake_div.style('stroke');
var clickedWidth = fake_div.style('stroke-width');
fake_div.remove();

// Create svg
var svg = d3.select("body").append("svg")
  .attr("height", "100%")
  .attr("width", "100%");

loadWrapper('goodread_library_export.csv')

/**
 * loadWrapper interprets a library csv for the first time
 * @param {String} fname - name of library CSV
 * @return {null}
 */
function loadWrapper(fname) {
  d3.csv(fname)
    .row(interpretGR).get(initialShelf)

  return null
}

/**
 * readGR interprets a row of a GoodReads library csv
 * @param {Object} d - Object with default GoodReads export columns
 * @return {Object}   Object with reformatted data
 */
function interpretGR(d) {

  // Create holder for output
  var pointobj = {}

  // Make list of all authors
  authorlist = [d['Author']].concat(d['Additional Authors'].split(', '))
  /** @todo fix this so it only seeks cases with lowercase leading letter*/
  if (d['Author l-f'].includes("'")) {
    auth = d['Author l-f'].split("'")
    pointobj['author'] = auth[1]
  } else {
    pointobj['author'] = d['Author l-f']
  }

  // If there are additional authors, truncate list for display
  if (d['Additional Authors']) {
    pointobj['authors'] = authorlist.join(', ')
    var firstAuthors = authorlist.slice(0, 2)
    pointobj['displayAuthors'] = firstAuthors.join(', ') + ", et al."
  } else {
    pointobj['authors'] = d['Author']
    pointobj['displayAuthors'] = d['Author']
  }
  // Retain full list of additional authors
  pointobj['coauthor'] = d['Additional Authors']

  // Extract series information from title field
  var title = d['Title']
  // Get just the title
  var basetitle = title.split('(')[0]
  pointobj['title'] = basetitle
  // Split series information into series title and number
  var series = title.split('(')[1]
  if (series) {
    series = series.split(')')[0].split('#')
    pointobj['series'] = series[0].split(',')[0].trim()
    // Only seek the number if this is a numbered series
    if (series[1]) {
      pointobj['seriesNum'] = Number(series[1].trim())
    } else {
      pointobj['seriesNum'] = ''
    }
    pointobj['seriesAll'] = [pointobj['series'], pointobj['seriesNum']].join(', ')
  } else { // If this is not a series, leave fields empty
    pointobj['series'] = undefined
    pointobj['seriesNum'] = undefined
  }

  // Store remaining string information
  pointobj['publisher'] = d['Publisher']
  pointobj['binding'] = d['Binding']
  pointobj['status'] = d['Exclusive Shelf']

  // Convert number formatted information into numbers
  pointobj['numPage'] = Number(d['Number of Pages'])
  pointobj['ISBN'] = Number(d['ISBN'])
  pointobj['ISBN13'] = Number(d['ISBN13'])
  pointobj['GRBookID'] = Number(d['Book Id'])
  pointobj['rating'] = Number(d['My Rating'])
  pointobj['meanRating'] = Number(d['Average Rating'])

  // Convert date formatted information into dates
  pointobj['pubYear'] = parseYear(d['Original Publication Year'])
  pointobj['edYear'] = parseYear(d['Year Published'])
  pointobj['dateRead'] = parseDay(d['Date Read'])
  pointobj['dateAdded'] = parseDay(d['Date Added'])
  return pointobj
}

/**
 * initialShelf shelves a new library for the first time
 * @param {Array} data - Array of Objects, each of which corresponds to a book
 * @param {String} sortkey - Default sorting column name
 * @param {Array} secondaryKeys - Array of secondary columns to sort by
 * @return {Array} Sorted version of input data
 */
function sortLibrary(data, sortkey = 'author', secondaryKeys = secondaryKeys) {
  // Precalc the number of seconday keys
  var numKeys = secondaryKeys.length
  // Get new list of secondary keys that excludes the primary key
  var skeys = []
  for (var k = 0; k < numKeys; k++) {
    if (secondaryKeys[k] !== sortkey) {
      skeys.push(secondaryKeys[k])
    }
  }
  // Precalc the number of secondary keys
  numKeys = skeys.length
  // Perform sort
  data = data.slice().sort(function (a, b) {
    // Start with primary key
    var sorted = d3.ascending(a[sortkey], b[sortkey])
    // Iterate through each secondary key
    for (var k = 0; k < numKeys; k++) {
      sorted = sorted || d3.ascending(a[skeys[k]], b[skeys[k]])
    }
    return sorted
  })
  // Return sorted data
  return data
}

/**
 * Update the window size parameters and redefine the margin
 * @return {null}
 */
function windowSize() {
  // update window size and define margins
  twidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth
  theight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight
  margin = {
    left: 100,
    right: 100,
    top: 30,
    bottom: 30
  }
  return null
}

/**
 * makeshelf determines the positional information of a bookcase and draws it
 * @param {Number} xstart - x position of the left edge of the bookcase
 * @return {Array} Array containing the bounds at 0 and the shelfStarts at 1
 */
function makeshelf(xstart) {

  // Store properties for drawing each shelf
  var shelfProperties = [];
  // Store y positions for each shelf for passing on
  var shelfStarts = [];

  // Set the top of the bookcase
  var y0 = margin.top + caseThickness;

  // Loop over each shelf
  for (var i = 0; i < numshelf; i++) {
    // create rectangle for background of books
    var shelfBack = {
      "name": "background", // for classing to get colour
      "ind": i,
      // for drawing rectangles
      "x": xstart + (0.5 * caseThickness),
      "y": y0 - (shelfThickness * 0.5),
      "height": sheight + shelfThickness,
      "width": swidth + caseThickness
    }
    // create actual shelf
    var shelfProp = {
      "name": "shelf", // for classing to get colour
      "ind": i,
      // for drawing rectangles
      "x": xstart + caseThickness,
      "y": y0 + sheight,
      "height": shelfThickness,
      "width": swidth
    };
    // Add shelf position information to pass on
    shelfStarts.push({
      "x": xstart + caseThickness,
      "y": y0 + sheight
    });
    // Put backgrounds at the front so they draw first
    shelfProperties.unshift(shelfBack);
    // Put shelves at the end so they draw last
    shelfProperties.push(shelfProp);
    // Update starting position to be the next shelf down
    y0 += sheight;
  }

  // Define properties of bookcase (done after shelves so they draw last)
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

  // calculate the extreme edges of the bookcase
  var bounds = {
    "xinner": xleft,
    "xouter": xright + caseThickness,
    "yupper": ytop,
    "ylower": ybottom + caseThickness
  }

  // Add properties of the bookcase to the end so they draw last
  shelfProperties = shelfProperties.concat(caseProperties);

  // Create rectangles to draw the shelves
  // Selection is only for this bookshelf so others can be drawn
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

  // Return object with extremes of bookcase, and information about where each
  // shelf starts
  return [bounds, shelfStarts];
}

/**
 * labelCases adds labels to the bookcases
 * @param {Array} visibleCases - Array of indexes of visible bookcases
 * @param {Array} caseLimits - Array of objects with start and end strings
 * @return {null}
 */
function labelCases(visibleCases, caseLimits) {
  // Create place to store label information
  var labelInfo = []
  // Calculate the number of cases for iteration
  var numCases = visibleCases.length
  /** @todo make these dynamic with label length */
  // Calculate width and height of label
  var w = swidth * 0.4
  var h = 0.95 * (sheight - bheight)
  // Loop over visible cases and get positions
  for (i = 0; i < numberCases; i++) {
    var x = ((caseBounds[i].xouter - caseBounds[i].xinner) / 2) + caseBounds[i].xinner
    var y = caseBounds[i].yupper
    // First, number shelf
    var label = 'Shelf ' + (visibleCases[i] + 1)
    // Next, add sort information
    label = label + ' (' + caseLimits[i].start + '-' + caseLimits[i].end + ')'
    info = {
      'x': x - (w / 2), // need to update for width to get centered label
      'y': y,
      'w': w,
      'h': h,
      'size': h,
      'label': label
    }
    labelInfo.push(info)
  }
  // Clean existing labels first
  svg.selectAll("rect.labels").remove()
  svg.selectAll("text.labeltext").remove()

  // Draw label backgrounds
  svg.selectAll("rect.labels")
    .data(labelInfo)
    .enter().append("rect")
    .attr("x", function (d, i) {
      return d.x
    })
    .attr("y", function (d, i) {
      return d.y
    })
    .attr("width", function (d, i) {
      return d.w
    })
    .attr("height", function (d, i) {
      return d.h
    })
    .attr("class", "labels")
  // Draw label text
  svg.selectAll("text.labeltext")
    .data(labelInfo)
    .enter().append("text")
    .text(function (d, i) {
      return d.label
    })
    .attr("x", function (d, i) {
      return d.x + (d.w / 2)
    })
    .attr("y", function (d, i) {
      return d.y + (d.h * 0.75)
    })
    .attr("class", "labeltext")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .style("font-size", function (d, i) {
      return d.size + " px";
    })
  return null
}

/**
 * prepBooks calculated coordinates for all books that will fit on the page
 * @param {Array} data - Array of Objects, each of which corresponds to a book
 * @return {[type]}      [description]
 */
function prepBooks(bookInd, caseShelves, caseLimits, sortkey, sizekey) {
  // Start on first bookcase and first shelf
  caseInd = 0
  var shelfInd = 0
  // Use this tracker to count total number of books in the bookcases
  // needed to handle some special labelling cases
  var caseTracker = 0

  // Get starting positions for first book
  var x0 = caseShelves[caseInd][shelfInd].x + bookGap
  var y0 = caseShelves[caseInd][shelfInd].y - 1.1

  // Create Array for book position objects
  var vertices = []

  // To find book positions, cycle through each book
  for (i = bookInd; i < numberbooks; i++) {
    if (data[i][sizekey]) {
      var booklength = data[i][sizekey] * pg2px
    } else { // specify a default size for missing page counts
      var booklength = 200 * pg2px
    }

    // Check whether there's room on the shelve for a new book
    // First find out how much space is left
    var spaceLeft = (caseShelves[caseInd][shelfInd].x + swidth - bookGap)
    if ((x0 + booklength) > spaceLeft) {
      // If shelf is full, move to the next shelf in the case, or if there
      // are no shelves, move to the next case
      if (shelfInd < caseShelves[caseInd].length - 1) {
        // Move to next shelf
        shelfInd += 1
        // Get new starting position
        x0 = caseShelves[caseInd][shelfInd].x + bookGap
        y0 = caseShelves[caseInd][shelfInd].y - 1.1
        caseTracker += 1
      } else {
        if (caseInd < totalCase) {
          // Update bookcase labels
          caseLimits[caseInd].end = data[i][sortkey][0]
          // Move to next case
          caseInd += 1
          // Start on top shelf of the new case
          shelfInd = 0
          // Get new starting position
          x0 = caseShelves[caseInd][shelfInd].x + bookGap
          y0 = caseShelves[caseInd][shelfInd].y - 1.1
          // Update bookcase labels
          caseLimits[caseInd].start = data[i][sortkey][0]
          // Since start is already logged, start at index 0 instead
          caseTracker = 1
        } else {
          // Stop making books! But make sure we keep track of where we left off
          caseLimits[caseInd].end = data[i - 1][sortkey][0]
          break
        }
      }
    }
    // This is a handler for first book on first bookcase
    if (caseTracker === 0) {
      caseLimits[caseInd].start = data[i][sortkey][0]
    }
    // This is a handler for the last book in the case
    // needed for situation where not all available cases are used
    if (i === (numberbooks - 1)) {
      caseLimits[caseInd].end = data[i][sortkey][0]
    }
    // Create bounds of the book
    bottomL = [x0, y0]
    bottomR = [x0 + booklength, y0]
    topR = [x0 + booklength, y0 - bheight]
    topL = [x0, y0 - bheight]
    bookshape = [bottomL, bottomR, topR, topL]
    x0 += booklength + bookGap
    vertices.push(bookshape)
  }
  // If not all visible cases were used, scrub labels for unused cases
  if (caseInd < totalCase) {
    for (var j = caseInd + 1; j <= totalCase; j += 1) {
      caseLimits[j].start = ''
      caseLimits[j].end = ''
    }
  }
  return {
    'bookIndStart': bookInd,
    'bookIndEnd': i,
    'vertices': vertices,
    'caseLimits': caseLimits,
    'caseInd': caseInd
  };
}

/**
 * shelveBooks draws rectangles for each book
 * @param {Object} bookInfo - Object with information about book position
 * @return {Number} Index of final book that was drawn
 */
function shelveBooks(bookInfo) {
  // Unpack object
  bookIndStart = bookInfo.bookIndStart
  vertices = bookInfo.vertices
  // Clean up all the books currently drawn
  bookGroup.selectAll(".book").remove()

  // Draw the new books
  bookGroup.selectAll("path.book")
    .data(vertices)
    .enter().append("path")
    .attr("d", function (d) {
      return "M" + d.join("L") + "Z" // convert vertices to path instructions
    })
    .attr("class", function (d, i) {
      return "book " + data[i].status;
    })
  return bookInfo.bookIndEnd;

}

/**
 * drawButtons creates scroll buttons
 * @param {Number} bookInd - index of current book
 * @return {null}
 */
function drawButtons(bookInd, bookInfo, numberbooks, casePosition) {
  var caseBounds = bookInfo.caseBounds;
  // Set positions for the buttons
  var middley = ((caseBounds[0].ylower - caseBounds[0].yupper) / 2);
  // x and y positions
  var leftButtonx = margin.left / 2;
  var rightButtonx = caseBounds[caseBounds.length - 1].xouter + leftButtonx;
  var leftButtony = middley + caseBounds[0].yupper;
  var rightButtony = leftButtony;
  // radius of button
  var buttonr = margin.left * 0.25;
  // button font size
  var buttonfs = buttonr * 0.75;

  // create array to hold button information
  var buttons = [{
    'cx': leftButtonx,
    'cy': leftButtony,
    'direction': 'left',
    'label': 'previous',
    'r': buttonr,
    'size': buttonfs
  }, {
    'cx': rightButtonx,
    'cy': rightButtony,
    'direction': 'right',
    'label': 'next',
    'r': buttonr,
    'size': buttonfs
  }];

  // half opening angle of the arrow
  var angle = 32 * Math.PI / 180; //radians

  // arrow properties
  var awidth = 20;
  var athick = 7;
  var abuffer = 3;

  // center the arrows
  xstartL = buttons[0].cx - 1.2 * (awidth / 2);
  ystartL = buttons[0].cy;
  xstartR = buttons[1].cx + 1.2 * (awidth / 2);
  ystartR = buttons[1].cy;

  // set properties of button transitions
  var buttonDuration = 130;
  var buttonDelay = 0;

  // create arrow vertices
  var arrows = [ //left arrow
    [
      [xstartL,
        ystartL
      ],
      [xstartL + awidth,
        line(xstartL + awidth, xstartL, ystartL, angle)
      ],
      [xstartL + awidth,
        line(xstartL + awidth, xstartL, ystartL - athick, angle)
      ],
      [invertline(ystartL, xstartL, ystartL - athick, angle),
        ystartL
      ],
      [xstartL + awidth,
        line(xstartL + awidth, xstartL, ystartL + athick, -angle)
      ],
      [xstartL + awidth,
        line(xstartL + awidth, xstartL, ystartL, -angle)
      ],
      [xstartL,
        ystartL
      ]
    ],
    [ //right arrow
      [xstartR,
        ystartR
      ],
      [xstartR - awidth,
        line(xstartR - awidth, xstartR, ystartR, -angle)
      ],
      [xstartR - awidth,
        line(xstartR - awidth, xstartR, ystartR - athick, -angle)
      ],
      [invertline(ystartR, xstartR, ystartR - athick, -angle),
        ystartR
      ],
      [xstartR - awidth,
        line(xstartR - awidth, xstartR, ystartR + athick, angle)
      ],
      [xstartR - awidth,
        line(xstartR - awidth, xstartR, ystartR, angle)
      ],
      [xstartR,
        ystartR
      ]
    ]
  ]

  // create button group to hold shapes and text together
  var buttonGroup = svg.append("g")

  // draw button text
  buttonGroup.selectAll("text.btext")
    .data(buttons)
    .enter().append("text")
    .text(function (d, i) {
      return d.label
    })
    .attr("x", function (d, i) {
      return d.cx
    })
    .attr("y", function (d, i) {
      return d.cy + (1.75 * d.r)
    })
    .attr("class", function (d, i) {
      return "button btext " + d.direction
    })
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .style("font-size", function (d, i) {
      return d.size + "px";
    })
    .style("stroke-width", 0)

  //
  buttonGroup.selectAll("text.btext.left")
    .style("fill", inactiveStroke)
    .style("opacity", inactiveOpacity)

  if (bookInd < numberbooks) {
    buttonGroup.selectAll("text.btext.right")
      .style("fill", activeStroke)
      .style("opacity", activeOpacity)
  } else {
    buttonGroup.selectAll("text.btext.right")
      .style("fill", inactiveStroke)
      .style("opacity", inactiveOpacity)
  }

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
    .attr("r", function (d, i) {
      return d.r
    })
    .attr("class", function (d, i) {
      return "button " + d.direction;
    })

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


  // update button properties - right situation is conditional
  if (bookInd < numberbooks) {
    buttonGroup.selectAll(".right")
      .classed("active", true)
  } else {
    buttonGroup.selectAll(".right")
      .classed("inactive", true)
  }
  // hide left button because we're all the start
  buttonGroup.selectAll(".left")
    .classed("inactive", true)

  /**
   * moveRight specifies behaviour for button to move right
   * @return {null}
   */
  function moveRight() {
    if (bookInd < numberbooks) {
      casePosition = casePosition + 1
      firstBook.push(bookInd)
    }
    bookIndStart = firstBook[casePosition]
    bookInfo = prepBooks(bookIndStart)
    bookInd = bookInfo.bookIndEnd
    buttonGroup.selectAll("text").style("opacity", 0)
    // Change left button appearance
    if (bookIndStart > 0) {
      buttonGroup.selectAll(".left")
        .classed("inactive", false)
        .classed("active", true)
        .style("fill", activeFill)
        .style("stroke", activeStroke)
        .style("stroke-width", activeWidth)
      buttonGroup.selectAll("text.btext.left")
        .style("stroke-width", 0)
        .style("fill", activeStroke)
        .style("opacity", activeOpacity)
    } else {
      buttonGroup.selectAll(".left")
        .classed("active", false)
        .classed("inactive", true)
        .style("fill", inactiveFill)
        .style("stroke", inactiveStroke)
        .style("stroke-width", inactiveWidth)
      buttonGroup.selectAll("text.btext.left")
        .style("stroke-width", 0)
        .style("fill", inactiveStroke)
        .style("opacity", inactiveOpacity)
    }
    // Change right button appearance
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
      buttonGroup.selectAll("text.btext.right")
        .style("stroke-width", 0)
        .transition()
        .duration(buttonDuration)
        .delay(buttonDelay)
        .style("fill", clickedStroke)
        .transition()
        .duration(0)
        .delay(buttonDelay)
        .style("fill", activeStroke)
        .style("opacity", activeOpacity)
      visibleCases = visibleCases.map(function (item) {
        // Increment each item by 1
        return item + (totalCase + 1);
      });
      labelCases(visibleCases, bookInfo.caseLimits)
      shelveBooks(bookInfo)

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
          .style("opacity", inactiveOpacity)
        buttonGroup.selectAll("text.btext.right")
          .style("stroke-width", 0)
          .transition()
          .duration(buttonDuration)
          .delay(buttonDelay)
          .style("fill", clickedStroke)
          .transition()
          .duration(0)
          .delay(buttonDelay)
          .style("fill", inactiveStroke)
          .style("opacity", inactiveOpacity)
        visibleCases = visibleCases.map(function (item) {
          // Increment each item by 1
          return item + (totalCase + 1);
        });
        labelCases(visibleCases, bookInfo.caseLimits)
        shelveBooks(bookInfo)
      } else {
        buttonGroup.selectAll(".right")
          .classed("active", false)
          .classed("inactive", true)
          .style("fill", inactiveFill)
          .style("stroke", inactiveStroke)
          .style("stroke-width", inactiveWidth)
        buttonGroup.selectAll("text.btext.right")
          .style("fill", inactiveStroke)
          .style("stroke-width", 0)
          .style("opacity", inactiveOpacity)
      }
    }
    return null
  }

  /**
   * moveLeft specifies behaviour for button to move right
   * @return {null}
   */
  function moveLeft() {
    casePosition = d3.max([0, casePosition - 1])
    bookIndStart = firstBook[casePosition]
    bookInfo = prepBooks(bookIndStart)
    bookInd = bookInfo.bookIndEnd
    buttonGroup.selectAll("text").style("opacity", 0)
    if (bookIndStart > 0) {
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
      buttonGroup.selectAll("text.btext.left")
        .style("stroke-width", 0)
        .transition()
        .duration(0)
        .delay(buttonDelay)
        .style("fill", clickedStroke)
        .transition()
        .duration(buttonDuration)
        .delay(buttonDelay)
        .style("fill", activeStroke)
        .style("opacity", activeOpacity)
      visibleCases = visibleCases.map(function (item) {
        // Increment each item by 1
        return item - (totalCase + 1);
      });
      labelCases(visibleCases, bookInfo.caseLimits)
      shelveBooks(bookInfo)
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
          .style("fill", clickedStroke)
        buttonGroup.selectAll("text.btext.left")
          .style("stroke-width", 0)
          .transition()
          .duration(0)
          .delay(buttonDelay)
          .style("fill", clickedStroke)
          .transition()
          .duration(buttonDuration)
          .delay(buttonDelay)
          .style("fill", inactiveStroke)
          .style("opacity", inactiveOpacity)
        visibleCases = visibleCases.map(function (item) {
          // Increment each item by 1
          return item - (totalCase + 1);
        });
        labelCases(visibleCases, bookInfo.caseLimits)
        shelveBooks(bookInfo)
      } else {
        buttonGroup.selectAll(".left")
          .classed("active", false)
          .classed("inactive", true)
          .style("fill", inactiveFill)
          .style("stroke", inactiveStroke)
          .style("stroke-width", inactiveWidth)
        buttonGroup.selectAll("text.btext.left")
          .style("stroke-width", 0)
          .style("fill", inactiveStroke)
          .style("opacity", inactiveOpacity)
      }
    }
    if (bookInd < numberbooks) {
      buttonGroup.selectAll(".right")
        .classed("inactive", false)
        .classed("active", true)
        .style("fill", activeFill)
        .style("stroke", activeStroke)
        .style("stroke-width", activeWidth)
      buttonGroup.selectAll("text.btext.right")
        .style("stroke-width", 0)
        .style("fill", activeStroke)
        .style("opacity", activeOpacity)
    } else {
      buttonGroup.selectAll(".right")
        .classed("active", false)
        .classed("inactive", true)
        .style("fill", inactiveFill)
        .style("stroke", inactiveStroke)
        .style("stroke-width", inactiveWidth)
      buttonGroup.selectAll("text.btext.right")
        .style("stroke-width", 0)
        .style("fill", inactiveStroke)
        .style("opacity", inactiveOpacity)
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

}

/**
 * initialShelf shelves a new library for the first time
 * @param {Array} data - Array of Objects, each of which corresponds to a book
 * @return {[type]}      [description]
 */
function initialShelf(data) {
  // Number of books in the library
  var numberbooks = data.length
  // Total number of pages in those books
  var numberpages = d3.sum(data, d => d.numPage)

  windowSize()
  // calculate the number of shelves that will fit on the page vertically
  var numshelf = Math.floor((theight - margin.top - margin.bottom) / sheight)
  // calculate the available horizontal space for bookcases
  var availSpace = twidth - margin.right
  // Sort the library
  var sortkey = 'author'
  data = sortLibrary(data, sortkey, secondaryKeys = secondaryKeys)
  // Add tracker for the case that's currently active
  var caseInd = 0;
  // Add a tracker to count the number of cases that will fit on screen
  var totalCase = 0;
  // Create Array to track which cases are visible - since scrolling may
  // be needed to show all of the books
  var visibleCases = [0];
  // Create an Array to keep track of the limits of the sorting property that
  // each bookcase contains (start empty because books haven't been shelved)
  var caseLimits = [{
    'start': '',
    'end': ''
  }]
  var currentCase = makeshelf(margin.left + 0)
  // Create these variables as Arrays because we may need to make more shelves
  var caseBounds = [currentCase[0]]
  var caseShelves = [currentCase[1]]

  // Create as many more cases as we can to fill the horizontal space
  while (true) {
    // Predict how much space the next case will take
    shelfExtent = caseBounds[caseInd].xouter + (caseThickness * 2) + swidth + (caseGap * 2)
    // If there's room for the case, draw it, otherwise break
    if (shelfExtent <= availSpace) {
      currentCase = makeshelf(caseBounds[caseInd].xouter + caseGap);
      // Update all our trackers
      caseBounds.push(currentCase[0]);
      caseShelves.push(currentCase[1]);
      totalCase += 1;
      caseInd += 1;
      visibleCases.push(caseInd)
      caseLimits.push({
        'start': '',
        'end': ''
      })
    } else {
      break
    }
  }
  // Create group to hold book objects (I think I might just do this with class)
  var bookGroup = svg.append("g")
  // Shelve the first page
  var casePosition = 0
  var firstBook = [0]
  var bookIndStart = firstBook[casePosition]
  bookInfo = prepBooks(firstBook[casePosition])
  bookInd = shelveBooks(bookInfo)
  labelCases(visibleCases, bookInfo.caseLimits)
  // drawButtons(bookInd, bookInfo)
}
