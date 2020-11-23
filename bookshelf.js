var parseDay = d3.timeParse("%Y/%m/%d")
var parseYear = d3.timeParse("%Y")
d3.csv("goodreads_small.csv")
  .row(function(d){
    var pointobj = {}
    authorlist = [d['Author'], d['Additional Authors']]
    // Strings
    pointobj['author'] = d['Author l-f']
    if (d['Additional Authors']) {
      pointobj['authors'] = authorlist.join(', ')
    }
    else{
      pointobj['authors']=d['Author']
    }
    pointobj['coauthor'] = d['Additional Authors']

    // Extract series information from title
    var title = d['Title']
    var basetitle = title.split('(')[0]
    pointobj['title'] = basetitle
    var series = title.split('(')[1]
    if (series){
      series = series.split(')')[0].split('#')
      pointobj['series'] = series[0].split(',')[0].trim()
      pointobj['seriesNum'] = Number(series[1].trim())
      pointobj['seriesAll'] = [pointobj['series'], pointobj['seriesNum']].join(', ')
    }
    else{
      pointobj['series'] = undefined
      pointobj['seriesNum'] = undefined
    }

    console.log(pointobj['series'],pointobj['seriesAll'])

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
    return pointobj })
  .get(function(error,data){

    // need to write a handler for books with no page count

    data = data.slice().sort(function(a,b){
      d3.ascending(a.author,b.author) || d3.ascending(a.seriesAll,b.seriesAll)})

    console.log(data)

    var numberbooks = data.length
    var numberpages = d3.sum(data, d => d.numPage)

    //calculate the number of bookcase
    //~20 books per shelf, 5 shelves per bookcase
    //stretch goal - add bookends?

    //ASSUME INFINITE SCROLL BOOKCASES

    var width = window.innerWidth||document.documentElement.clientWidth||document.body.clientWidth
    var height = window.innerHeight||document.documentElement.clientHeight||document.body.clientHeight
    var margin = {left: 50, right: 50, top: 40, bottom: 0}

    var svg = d3.select("body").append("svg").attr("width","100%").attr("height","100%")


    // define for each shelf
    var xScale = d3.scaleLinear()
      .domain([0, numberpages])
      .range([0, width])
    var yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0])

    vertices = []
    var x0 = 0
    var y0 = 0
    var y1 = 100
    var gap = 7

    // loop over books and append their vertices
    var i;
    for (i = 0; i < numberbooks; i++){
      bottomL = [xScale(x0),yScale(y0)]
      bottomR = [xScale(x0+data[i].numPage),yScale(y0)]
      topR = [xScale(x0+data[i].numPage),yScale(y1)]
      topL = [xScale(x0),yScale(y1)]
      bookshape = [bottomL,bottomR,topR,topL]
      x0 += data[i].numPage + gap
      vertices.push(bookshape)
    }
    console.log(vertices)

    // // create book tooltip
    //
    var tooltip = d3.select("body").append("div").style("opacity","0").style("position","absolute")
    //
    // // create book object
    //

    var shelf = svg.append("g")
    shelf.append("g").attr("class","books")
      .selectAll("path")
        .data(vertices)
        .enter().append("path")
          .attr("d",function(d){ return "M"+d.join("L")+"Z" })
          .on("mousemove",function(d,i){
            tooltip.style("opacity","1")
                    .style("left",d[2][0]+"px")
                    .style("top",d[2][1]+"px")

            tooltip.html("Author(s): "+data[i].authors+"<br>Title: "+data[i].title)
          })

    //size dynamically to book width
    shelf.append("g").attr("class","titles")
      .selectAll("text")
        .data(vertices)
        .enter().append("text")
          .attr("x",function(d){ return (d[0][0]+d[1][0])/2; })
          .attr("y",function(d){ return (d[0][1]+d[2][1])/2; })
          .attr("transform",function(d){
            var xpos = (d[0][0]+d[1][0])/2
            var ypos = (d[0][1]+d[2][1])/2
            return "rotate(270, "+xpos+", "+ypos+")" })
          .text(function(d,i){ return data[i].title })
          .style("text-anchor", "middle")
          .style("dominant-baseline", "central");

})
