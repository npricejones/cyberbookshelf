var parseDay = d3.timeParse("%Y/%m/%d")
var parseYear = d3.timeParse("%Y")

console.log(parseYear("1975").getFullYear())

// general line functions
function line(x, x0, y0, angle) {
  var m = Math.tan(angle)
  return m * (x - x0) + y0;
}

function invertline(y, x0, y0, angle) {
  var m = Math.tan(angle)
  return ((y - y0) / m) + x0;
}


function fillArray(value, len) {
  var arr = new Array(len);
  for (var i = 0; i < len; i++) {
    arr[i] = value;
  }
  return arr;
}

var displayNames = {
  'title': 'title',
  'displayAuthors': 'author',
  'seriesAll': 'series',
  'pubYear': 'release',
}

var yearList = ['pubYear']

/**
 * loadWrapper interprets a library csv and shelves it
 * @param {function} interpretGR - name of function to parse rows
 * @param {String} fname - name of library CSV
 * @return {null}
 */
function loadWrapper(rowfn = interpretGR, sortkey = 'author',
  fname = "goodreads_library_export.csv") {
  d3.csv(fname)
    .row(rowfn)
    .get(function (data) { // anonymous function to allow kwarg passing
      shelveLibrary(data, sortkey = sortkey)
    })
}

/**
 * readGR interprets a row of a GoodReads library csv
 * @param {Object} d - Object with default GoodReads export columns
 * @return {Object}   Object with reformatted data
 */
function interpretGR(d) {
  var pointobj = {}
  authorlist = [d['Author']].concat(d['Additional Authors'].split(', '))
  // Strings
  // Handler for if the Author's name has a preceding apostrophe
  // This is really chunky, may exclude unintended names
  // Are the cases I want to handle always a single letter?
  // Maybe just do case check
  if (d['Author l-f'].includes("'")) {
    auth = d['Author l-f'].split("'")
    pointobj['author'] = auth[1]
  } else {
    pointobj['author'] = d['Author l-f']
  }
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
    if (series[1]) {
      pointobj['seriesNum'] = Number(series[1].trim())
    } else {
      pointobj['seriesNum'] = ''
    }
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
}

function shelveLibrary(data, sortkey = null) {
  // need to write a handler for books with no page count
  //extract styles from css


  var bookFill = {}
  var bookStroke = {}
  var bookWidth = {}

  var buttonFill = {}
  var buttonStroke = {}
  var buttonWidth = {}

  function getStyle() {
    // books
    var fake_div = d3.select('body')
      .append('div')
      .attr('class', 'shelf book read')
      .style('display', 'none')
    readFill = fake_div.style('fill');
    readStroke = fake_div.style('stroke');
    readWidth = fake_div.style('stroke-width');

    fake_div.remove();

    var fake_div = d3.select('body')
      .append('div')
      .attr('class', 'book to-read')
      .style('display', 'none')
    toreadFill = fake_div.style('fill');
    toreadStroke = fake_div.style('stroke');
    toreadWidth = fake_div.style('stroke-width');

    fake_div.remove();

    var fake_div = d3.select('body')
      .append('div')
      .attr('class', 'book current')
      .style('display', 'none')
    currentFill = fake_div.style('fill');
    currentStroke = fake_div.style('stroke');
    currentWidth = fake_div.style('stroke-width');

    fake_div.remove();

    var fake_div = d3.select('body')
      .append('div')
      .attr('class', 'book looking')
      .style('display', 'none')
    lookingFill = fake_div.style('fill');
    lookingStroke = fake_div.style('stroke');
    lookingWidth = fake_div.style('stroke-width');

    fake_div.remove();

    bookFill = {
      'read': readFill,
      'to-read': toreadFill,
      'current': currentFill,
      'looking': lookingFill
    }

    bookStroke = {
      'read': readStroke,
      'to-read': toreadStroke,
      'current': currentStroke,
      'looking': lookingStroke
    }

    bookWidth = {
      'read': readWidth,
      'to-read': toreadWidth,
      'current': currentWidth,
      'looking': lookingWidth
    }

    // buttons
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

    var fake_div = d3.select('body')
      .append('div')
      .attr('class', 'button clicked')
      .style('display', 'none')
    clickedFill = fake_div.style('fill');
    clickedStroke = fake_div.style('stroke');
    clickedWidth = fake_div.style('stroke-width');

    fake_div.remove();

    buttonFill = {
      'active': activeFill,
      'inactive': inactiveFill,
      'clicked': clickedFill
    }

    buttonStroke = {
      'active': activeStroke,
      'inactive': inactiveStroke,
      'clicked': clickedStroke
    }

    buttonStroke = {
      'active': activeStroke,
      'inactive': inactiveStroke,
      'clicked': clickedStroke
    }
  }

  getStyle()

  /**
   * sortLibrary sorts the data object
   * @param {Array} data - Array of Objects, each of which corresponds to a book
   * @param {String} sortkey - Default sorting column name
   * @param {Array} secondaryKeys - Array of secondary columns to sort by
   * @return {Array} Sorted version of input data
   */
  this.sortLibrary = function (data, sortkey = 'author',
    secondaryKeys = ['author', 'series', 'seriesNum', 'pubYear']) {
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

  data = sortLibrary(data)

  var numberbooks = data.length
  var numberpages = d3.sum(data, d => d.numPage)

  var twidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth
  var theight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight

  var panelTop = 30
  var closedBottom = 70
  var margin = {
    left: 100,
    right: 100,
    top: closedBottom,
    bottom: 30
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

  var svg = d3.select("body").append("svg")
    .attr("height", "100%")
    .attr("width", "100%");

  var infoPanel = svg.append("g")
  var bookCases = svg.append("g")
  var buttonGroup = svg.append("g")

  function cleansvg() {
    infoPanel.selectAll("*").remove()
    bookCases.selectAll("*").remove()
    buttonGroup.selectAll("*").remove()
  }

  totalCase = drawShelves(margin)
  var panelVis = null
  showPanel()

  function hidePanel() {
    cleansvg()
    panelVis = false
    totalCaseWidth = ((totalCase + 1) * (swidth + (caseThickness * 2)))
    totalCaseWidth += (totalCase * caseGap)
    margin['top'] = closedBottom
    panelHeight = margin.top - panelTop - caseGap
    var message = [{
      'x': margin.left + (totalCaseWidth / 2),
      'y': panelTop + 22.5,
      'label': "click to show book info"
    }]
    var panelProp = [{
      'x': margin.left,
      'y': panelTop,
      'rx': 15,
      'ry': 15,
      'width': totalCaseWidth,
      'height': panelHeight
    }]
    infoPanel.selectAll("rect.info")
      .data(panelProp)
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
      .attr("rx", function (d, i) {
        return d.rx
      })
      .attr("ry", function (d, i) {
        return d.ry
      })
      .attr("class", function (d, i) {
        return "info background";
      })
      .on("click", showPanel)
    infoPanel.selectAll("text.panel")
      .data(message)
      .enter().append("text")
      .text(function (d, i) {
        return d.label
      })
      .attr("x", function (d, i) {
        return d.x
      })
      .attr("y", function (d, i) {
        return d.y
      })
      .attr("class", function (d, i) {
        return "info label header"
      })
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .on("click", showPanel)
    totalCase = drawShelves(margin)
  }

  function showPanel() {
    cleansvg()
    panelVis = true
    totalCaseWidth = ((totalCase + 1) * (swidth + (caseThickness * 2)))
    totalCaseWidth += (totalCase * caseGap)
    margin['top'] = 300
    panelHeight = margin.top - panelTop - caseGap
    var message = [{
      'x': margin.left + (totalCaseWidth / 2),
      'y': panelTop + 22.5,
      'label': "click to hide book info",
      'function': hidePanel
    }]
    var panelProp = [{
      'x': margin.left,
      'y': panelTop,
      'rx': 15,
      'ry': 15,
      'width': totalCaseWidth,
      'height': panelHeight
    }]
    infoPanel.selectAll("rect.info")
      .data(panelProp)
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
      .attr("rx", function (d, i) {
        return d.rx
      })
      .attr("ry", function (d, i) {
        return d.ry
      })
      .attr("class", function (d, i) {
        return "info background";
      })
      .on("click", hidePanel)
    infoPanel.selectAll("text.info")
      .data(message)
      .enter().append("text")
      .text(function (d, i) {
        return d.label
      })
      .attr("x", function (d, i) {
        return d.x
      })
      .attr("y", function (d, i) {
        return d.y
      })
      .attr("class", function (d, i) {
        return "info label header"
      })
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .on("click", hidePanel)

    names = ['title', 'displayAuthors', 'seriesAll', 'pubYear']
    var longest = names.reduce(
      function (a, b) {
        return displayNames[a].length > displayNames[b].length ? a : b;
      }
    );
    var bookProp = []
    for (n = 0; n < names.length; n++) {
      prop = {
        'label': displayNames[names[n]] + ': ',
        'x': margin.left + 15,
        'y': panelTop + 60 + 30 * n,
        'name': names[n]
      }
      bookProp.push(prop)
    }
    infoPanel.selectAll("text.slots")
      .data(bookProp)
      .enter().append("text")
      .text(function (d, i) {
        return d.label
      })
      .attr("x", function (d, i) {
        return d.x
      })
      .attr("y", function (d, i) {
        return d.y
      })
      .attr("class", function (d, i) {
        return "info label slots " + d.name
      })
      .attr("text-anchor", "left")
      .attr("alignment-baseline", "middle")
    var fillBox = []
    edgebbox = bbox = infoPanel.select("text." + longest).node().getBBox()
    for (n = 0; n < names.length; n++) {
      bbox = infoPanel.select("text." + names[n]).node().getBBox()
      fill = {
        'x': edgebbox.x + edgebbox.width + 10,
        'y': bbox.y - 2.5,
        'height': bbox.height + 5,
        'width': totalCaseWidth - edgebbox.width - 50
      }
      fillBox.push(fill)
    }
    infoPanel.selectAll("rect.slots")
      .data(fillBox)
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
        return "info background slots";
      })
    totalCase = drawShelves(margin)
  }

  function drawShelves(margin) {
    var numshelf = Math.floor((theight - margin.top - margin.bottom) / sheight)


    /**
     * makeshelf determines the positional information of a bookcase and draws it
     * @param {Number} xstart - x position of the left edge of the bookcase
     * @return {Array} Array containing the bounds at 0 and the shelfStarts at 1
     */
    this.makeshelf = function (xstart) {
      var shelfProperties = [];

      //iteratively create each shelf
      var y0 = margin.top + caseThickness;
      var shelfStarts = [];
      var i;
      for (i = 0; i < numshelf; i++) {
        // create shadow for background
        var shelfBack = {
          "name": "background",
          "ind": i,
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

      bookCases.selectAll("rect.x" + xstart)
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

    /**
     * labelCases adds labels to the bookcases
     * @param {Array} visibleCases - Array of indexes of visible bookcases
     * @param {Array} caseLimits - Array of objects with start and end strings
     * @return {null}
     */
    this.labelCases = function (visibleCases, caseLimits) {
      labelInfo = []
      for (i = 0; i < visibleCases.length; i++) {
        var x = ((caseBounds[i].xouter - caseBounds[i].xinner) / 2) + caseBounds[i].xinner
        var y = caseBounds[i].yupper
        var w = swidth * 0.4
        var h = 0.95 * (sheight - bheight)
        info = {
          'x': x - (w / 2),
          'y': y,
          'w': w,
          'h': h,
          'size': h,
          'label': 'Shelf ' + (visibleCases[i] + 1) + ' (' + caseLimits[i].start + '-' + caseLimits[i].end + ')'
        }
        labelInfo.push(info)
      }
      bookCases.selectAll("rect.labels").remove()
      bookCases.selectAll("text.labeltext").remove()
      bookCases.selectAll("rect.labels")
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
        .attr("class", "bookcase labels")
      bookCases.selectAll("text.labeltext")
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
        .attr("class", "bookcase labeltext")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .style("font-size", function (d, i) {
          return d.size + " px";
        })
    }

    /**
     * prepBooks calculated coordinates for all books that will fit on the page
     * @param {Array} bookInd - Index of first book to be shelved
     * @return {Object} - Object that contains information about the shelves
     */
    this.prepBooks = function (bookInd) {
      caseInd = 0
      var shelfInd = 0
      var caseTracker = 0
      var x0 = caseShelves[caseInd][shelfInd].x + bookGap
      var y0 = caseShelves[caseInd][shelfInd].y - 1.1

      var vertices = []

      for (i = bookInd; i < numberbooks; i++) {
        if (data[i].numPage) {
          var booklength = data[i].numPage * pg2px
        } else {
          var booklength = 200 * pg2px
        }

        if ((x0 + booklength) > (caseShelves[caseInd][shelfInd].x + swidth - bookGap)) {
          // If shelf is full, move to the next shelf in the case, or if there
          // are no shelves, move to the next case
          if (shelfInd < caseShelves[caseInd].length - 1) {
            shelfInd += 1
            x0 = caseShelves[caseInd][shelfInd].x + bookGap
            y0 = caseShelves[caseInd][shelfInd].y - 1.1
            caseTracker += 1
          } else {
            if (caseInd < totalCase) {
              caseLimits[caseInd].end = data[i][sortkey][0]
              caseInd += 1
              shelfInd = 0
              x0 = caseShelves[caseInd][shelfInd].x + bookGap
              y0 = caseShelves[caseInd][shelfInd].y - 1.1
              caseLimits[caseInd].start = data[i][sortkey][0]
              caseTracker = 1
            } else {
              caseLimits[caseInd].end = data[i - 1][sortkey][0]
              break
            }
          }
        }
        if (caseTracker === 0) {
          caseLimits[caseInd].start = data[i][sortkey][0]
        }
        if (i === (numberbooks - 1)) {
          caseLimits[caseInd].end = data[i][sortkey][0]
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
        'caseLimits': caseLimits
      };
    }

    function updatePanel(d, i) {
      if (panelVis) {
        infoPanel.selectAll("text.fill").remove()
        positions = infoPanel.selectAll("rect.slots").data()
        keyinfo = infoPanel.selectAll("text.slots").data()
        console.log(keyinfo)
        fillText = []
        for (var n = 0; n < positions.length; n++) {
          if ((yearList.indexOf(keyinfo[n].name) >= 0) && data[i][keyinfo[n].name]) {
            label = data[i][keyinfo[n].name].getFullYear()
          } else {
            label = data[i][keyinfo[n].name]
          }
          fill = {
            'x': positions[n].x + 5,
            'y': keyinfo[n].y,
            'label': label,
            'name': keyinfo[n].name,
          }
          fillText.push(fill)
        }
        console.log(fillText)
        infoPanel.selectAll("text.fill")
          .data(fillText)
          .enter().append("text")
          .text(function (d, i) {
            return d.label
          })
          .attr("x", function (d, i) {
            return d.x
          })
          .attr("y", function (d, i) {
            return d.y
          })
          .attr("class", function (d, i) {
            return "info fill f" + d.name
          })
          .attr("text-anchor", "left")
          .attr("alignment-baseline", "middle")
      }
    }

    /**
     * chooseBook highlights the appearance of the selected book
     * @param {Object} d - data point
     * @param {Number} i - data index
     * @return {null}
     */
    function chooseBook(d, i) {
      // Keep track of what the previously selected book was so we can
      // recolour it
      lastBook = selectedBook
      selectedBook = i
      // If we haven't locked to a book, you can highlight a new one
      if (d3.sum(lockedBook) == false) {
        // If a book was previously selected, updated its colour
        cleanLastBook(d, i)
        // Highlight the selected book
        d3.select("path.book.b" + selectedBook)
          .style("fill", bookFill["looking"])
          .style("stroke", bookStroke["looking"])
          .style("stroke-width", bookWidth["looking"])
        updatePanel(d, i)
      }
    }

    /** @todo make an object such that if you click anywhere outside the
    shelves you deselect current book */

    function cleanLastBook(d, i) {
      if (lastBook >= 0) {
        bookType = data[lastBook].status
        d3.selectAll("path.book.b" + lastBook)
          .style("fill", bookFill[bookType])
          .style("stroke", bookStroke[bookType])
          .style("stroke-width", bookWidth[bookType])
      }
    }

    /**
     * lockBook highlights a book and prevents others from being highlighted
     * If a book is already highlighted, this function then unlocks it
     * @param {Object} d - data point
     * @param {Number} i - data index
     * @return {null}
     */
    function lockBook(d, i) {
      // If no books are highlighted, highlight the current one
      if (d3.sum(lockedBook) == false) {
        lockedBook[i] = !lockedBook[i]
      } else {
        // If a book was locked, find its index
        lastBook = lockedBook.findIndex(function (val) {
          return val
        })
        // unlock previously highlighted book
        lockedBook[lastBook] = false
        // recolour the previously highlighted book
        cleanLastBook(d, i)
      }
      // if we didn't lock to the current book, highlight the new book
      chooseBook(d, i)
      showPanel(totalCase)
    }
    /**
     * shelveBooks draws rectangles for each book
     * @param {Object} bookInfo - Object with information about book positions
     * @return {Number} Index of final book that was drawn
     */
    this.shelveBooks = function (bookInfo) {
      bookIndStart = bookInfo.bookIndStart
      vertices = bookInfo.vertices
      bookCases.selectAll(".book").remove()

      bookCases.selectAll("path.book")
        .data(vertices)
        .enter().append("path")
        .attr("d", function (d) {
          return "M" + d.join("L") + "Z"
        })
        .attr("class", function (d, i) {
          return "bookcase book " + data[i].status + " b" + i;
        })
        .on("mouseover", chooseBook)
        .on("click", lockBook)
      return bookInfo.bookIndEnd;
    }

    /**
     * scrollButtons draws the buttons and assigns them behaviours
     * @return {null}
     */
    var buttonDuration = 130;
    var buttonDelay = 0;

    this.scrollButtons = function (buttonDuration = 130, buttonDelay = 0) {
      var leftButtonx = margin.left / 2;
      var rightButtonx = caseBounds[caseBounds.length - 1].xouter + leftButtonx;
      var leftButtony = ((caseBounds[0].ylower - caseBounds[0].yupper) / 2) + caseBounds[0].yupper;
      var rightButtony = leftButtony;
      var buttonr = margin.left * 0.25
      var buttonfs = buttonr * 0.75

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
          return "bookcase button " + d.direction;
        })

      // half opening angle of the arrow
      var angle = 32 * Math.PI / 180 //radians

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
          return "bookcase button " + buttons[i].direction;
        })


      // update button properties
      if (bookInd < numberbooks) {
        buttonGroup.selectAll(".right")
          .classed("active", true)
      } else {
        buttonGroup.selectAll(".right")
          .classed("inactive", true)
      }

      buttonGroup.selectAll(".left")
        .classed("inactive", true)

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
          return "bookcase button btext " + d.direction
        })
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .style("font-size", function (d, i) {
          return d.size + "px";
        })
        .style("stroke-width", 0)

      buttonGroup.selectAll("text.btext.left")
        .style("fill", buttonStroke['inactive'])

      if (bookInd < numberbooks) {
        buttonGroup.selectAll("text.btext.right")
          .style("fill", buttonStroke['active'])
      } else {
        buttonGroup.selectAll("text.btext.right")
          .style("fill", buttonStroke['inactive'])
      }


      function moveRight() {
        if (bookInd < numberbooks) {
          casePosition = casePosition + 1
          firstBook.push(bookInd)
        }
        bookIndStart = firstBook[casePosition]
        bookInfo = prepBooks(bookIndStart)
        selectedBook = -1
        lockedBook = fillArray(false, bookInfo.vertices.length)
        bookInd = bookInfo.bookIndEnd
        // Change left button appearance
        if (bookIndStart > 0) {
          buttonGroup.selectAll(".left")
            .classed("inactive", false)
            .classed("active", true)
            .style("fill", buttonFill['active'])
            .style("stroke", buttonStroke['active'])
            .style("stroke-width", buttonWidth['active'])
          buttonGroup.selectAll("text.btext.left")
            .style("stroke-width", 0)
            .style("fill", buttonStroke['active'])
        } else {
          buttonGroup.selectAll(".left")
            .classed("active", false)
            .classed("inactive", true)
            .style("fill", buttonFill['inactive'])
            .style("stroke", buttonStroke['inactive'])
            .style("stroke-width", buttonWidth['inactive'])
          buttonGroup.selectAll("text.btext.left")
            .style("stroke-width", 0)
            .style("fill", buttonStroke['inactive'])
        }
        // Change right button appearance
        if (bookInd < numberbooks) {
          buttonGroup.selectAll(".right")
            .classed("inactive", false)
            .classed("active", true)
            .transition()
            .duration(buttonDuration)
            .delay(buttonDelay)
            .style("fill", buttonFill['clicked'])
            .style("stroke", buttonStroke['clicked'])
            .style("stroke-width", buttonWidth['clicked'])
            .transition()
            .duration(buttonDuration)
            .delay(buttonDelay)
            .style("fill", buttonFill['active'])
            .style("stroke", buttonStroke['active'])
            .style("stroke-width", buttonWidth['active'])
          buttonGroup.selectAll("text.btext.right")
            .style("stroke-width", 0)
            .transition()
            .duration(buttonDuration)
            .delay(buttonDelay)
            .style("fill", buttonStroke['clicked'])
            .transition()
            .duration(buttonDuration)
            .delay(buttonDelay)
            .style("fill", buttonStroke['active'])
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
              .style("fill", buttonFill['clicked'])
              .style("stroke", buttonStroke['clicked'])
              .style("stroke-width", buttonWidth['clicked'])
              .transition()
              .duration(buttonDuration)
              .delay(buttonDelay)
              .style("fill", buttonFill['inactive'])
              .style("stroke", buttonStroke['inactive'])
              .style("stroke-width", buttonWidth['inactive'])
            buttonGroup.selectAll("text.btext.right")
              .style("stroke-width", 0)
              .transition()
              .duration(buttonDuration)
              .delay(buttonDelay)
              .style("fill", buttonStroke['clicked'])
              .transition()
              .duration(buttonDuration)
              .delay(buttonDelay)
              .style("fill", buttonStroke['inactive'])
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
              .style("fill", buttonFill['inactive'])
              .style("stroke", buttonStroke['inactive'])
              .style("stroke-width", buttonWidth['inactive'])
            buttonGroup.selectAll("text.btext.right")
              .style("fill", buttonStroke['inactive'])
              .style("stroke-width", 0)
          }
        }
      }

      function moveLeft() {
        casePosition = d3.max([0, casePosition - 1])
        bookIndStart = firstBook[casePosition]
        bookInfo = prepBooks(bookIndStart)
        selectedBook = -1
        lockedBook = fillArray(false, bookInfo.vertices.length)
        bookInd = bookInfo.bookIndEnd
        if (bookIndStart > 0) {
          buttonGroup.selectAll(".left")
            .classed("inactive", false)
            .classed("active", true)
            .transition()
            .duration(buttonDuration)
            .delay(buttonDelay)
            .style("fill", buttonFill['clicked'])
            .style("stroke", buttonStroke['clicked'])
            .style("stroke-width", buttonWidth['clicked'])
            .transition()
            .duration(buttonDuration)
            .delay(buttonDelay)
            .style("fill", buttonFill['active'])
            .style("stroke", buttonStroke['active'])
            .style("stroke-width", buttonWidth['active'])
          buttonGroup.selectAll("text.btext.left")
            .style("stroke-width", 0)
            .transition()
            .duration(buttonDuration)
            .delay(buttonDelay)
            .style("fill", buttonStroke['clicked'])
            .transition()
            .duration(buttonDuration)
            .delay(buttonDelay)
            .style("fill", buttonStroke['active'])
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
              .style("fill", buttonFill['clicked'])
              .style("stroke", buttonStroke['clicked'])
              .style("stroke-width", buttonWidth['clicked'])
              .transition()
              .duration(buttonDuration)
              .delay(buttonDelay)
              .style("fill", buttonFill['inactive'])
              .style("stroke", buttonStroke['inactive'])
              .style("stroke-width", buttonWidth['inactive'])
            buttonGroup.selectAll("text.btext.left")
              .style("stroke-width", 0)
              .transition()
              .duration(buttonDuration)
              .delay(buttonDelay)
              .style("fill", buttonStroke['clicked'])
              .transition()
              .duration(buttonDuration)
              .delay(buttonDelay)
              .style("fill", buttonStroke['inactive'])
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
              .style("fill", buttonFill['inactive'])
              .style("stroke", buttonStroke['inactive'])
              .style("stroke-width", buttonWidth['inactive'])
            buttonGroup.selectAll("text.btext.left")
              .style("stroke-width", 0)
              .style("fill", buttonStroke['inactive'])
          }
        }
        if (bookInd < numberbooks) {
          buttonGroup.selectAll(".right")
            .classed("inactive", false)
            .classed("active", true)
            .style("fill", buttonFill['active'])
            .style("stroke", buttonStroke['active'])
            .style("stroke-width", buttonWidth['active'])
          buttonGroup.selectAll("text.btext.right")
            .style("stroke-width", 0)
            .style("fill", buttonStroke['active'])
        } else {
          buttonGroup.selectAll(".right")
            .classed("active", false)
            .classed("inactive", true)
            .style("fill", buttonFill['inactive'])
            .style("stroke", buttonStroke['inactive'])
            .style("stroke-width", buttonWidth['inactive'])
          buttonGroup.selectAll("text.btext.right")
            .style("stroke-width", 0)
            .style("fill", buttonStroke['inactive'])
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




    // Create first book shelf
    var currentCase = makeshelf(margin.left + 0);

    // Create arrays to store shelf information
    var caseBounds = [currentCase[0]];
    var caseShelves = [currentCase[1]];

    // Start trackers for positional information
    // For visible cases
    var caseInd = 0;
    var totalCase = 0;
    // For global case position
    var visibleCases = [0];

    // Track properties of currently shelved books
    var caseLimits = [{
      'start': '',
      'end': ''
    }]

    // Measures to determine how many shelves will fit
    var shelfExtent = caseBounds[caseInd].xouter + caseGap
    var availSpace = twidth - margin.right

    // Create as many more bookshelves as needed
    // Break out if the next case would put us beyond the bounds of page
    // This could be done deterministically but I don't think it would be faster?
    while (true) {
      shelfExtent = caseBounds[caseInd].xouter + (caseThickness * 2) + swidth + (caseGap * 2)
      if (shelfExtent <= availSpace) {
        currentCase = makeshelf(caseBounds[caseInd].xouter + caseGap);
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
    };

    // Need to write a background for this
    var tooltip = d3.select("body")
      .append("div")
      .attr("class", "bookcase tooltip")
      .style("opacity", "0")
      .style("position", "absolute")

    // Populate first shelf
    var casePosition = 0
    var firstBook = [0]
    var bookIndStart = firstBook[casePosition]
    bookInfo = prepBooks(firstBook[casePosition])
    var selectedBook = -1
    var lockedBook = fillArray(false, bookInfo.vertices.length)
    bookInd = shelveBooks(bookInfo)
    labelCases(visibleCases, bookInfo.caseLimits)

    // Add scroll buttons
    scrollButtons()
    return totalCase
  }


}
