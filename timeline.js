;(function(){
  // container sizing
  const container = d3.select('#timeline').node();
  const bbox      = container.getBoundingClientRect();
  const margin    = {top: 20, right: 20, bottom: 30, left: 40};
  const W         = bbox.width  - margin.left - margin.right;
  const H         = bbox.height - margin.top  - margin.bottom;

  // set up svg with viewBox for responsiveness
  const svg = d3.select('#timeline')
    .append('svg')
      .attr('viewBox', `0 0 ${W+margin.left+margin.right} ${H+margin.top+margin.bottom}`)
      .attr('preserveAspectRatio','xMinYMin meet')
    .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

  const tooltipColor = {
    'Negative':'#d7191c',
    'Neutral' :'#fdae61',
    'Positive':'#1a9641'
  };

  // load and preprocess
  d3.csv('data/sentiment_data.csv', d => ({
    date:      d3.timeDay.floor(new Date(d.date)), // floor to midnight
    sentiment: +d.target===4?'Positive':(+d.target===2?'Neutral':'Negative')
  })).then(raw => {
    // rollup counts per day & sentiment
    const roll = d3.rollups(
      raw,
      v => v.length,
      d=>d.date,
      d=>d.sentiment
    );
    // array of {date, counts: {Neg,Neu,Pos}}
    const days = roll.map(([date, m]) => {
      const obj = { date };
      m.forEach(([sent, c]) => obj[sent] = c);
      // ensure zero for missing
      ['Negative','Neutral','Positive'].forEach(s => obj[s] = obj[s]||0);
      obj.total = obj.Negative + obj.Neutral + obj.Positive;
      return obj;
    }).sort((a,b)=>d3.ascending(a.date,b.date));

    // x‐scale for dates
    const x = d3.scaleTime()
      .domain(d3.extent(days, d=>d.date))
      .range([0, W]);

    // glyph size
    const glyphW = 20, glyphH = 20;

    // draw axis
    svg.append('g')
      .attr('class','axis')
      .attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(x).ticks(d3.timeMonth.every(2)))
      .selectAll('text')
        .attr('text-anchor','middle');

    // container for glyphs
    const gGlyphs = svg.append('g').attr('class','glyphs');

    // draw each day's glyph
    const glyph = gGlyphs.selectAll('.glyph')
      .data(days)
      .enter().append('g')
        .attr('class','glyph')
        .attr('transform', d => `translate(${x(d.date) - glyphW/2},${H - glyphH - 5})`);

    // for each sentiment, draw rect segments
    glyph.each(function(d) {
      const g = d3.select(this);
      const order = ['Negative','Neutral','Positive'];
      let xoff = 0;
      order.forEach(sent => {
        const w = (d[sent] / d.total) * glyphW;
        g.append('rect')
          .attr('x', xoff)
          .attr('y', 0)
          .attr('width', w)
          .attr('height', glyphH)
          .attr('fill', tooltipColor[sent]);
        xoff += w;
      });
    });

    // vertical brush
    const brush = d3.brushX()
      .extent([[0,0],[W,H]])
      .on('brush end', ({selection}) => {
        if (!selection) {
          // clear selection
          window.dispatchEvent(new CustomEvent('brushCleared'));
          return;
        }
        const [x0, x1] = selection.map(x.invert);
        window.dispatchEvent(new CustomEvent('timelineBrush',{
          detail: {  start: x0, end: x1 }
        }));
      });

    svg.append('g')
      .attr('class','brush')
      .call(brush);
  });
})();
