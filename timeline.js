;(function(){
  const container = d3.select('#timeline').node();
  const bbox      = container.getBoundingClientRect();
  const margin    = {top: 20, right: 20, bottom: 30, left: 40};
  const W         = bbox.width  - margin.left - margin.right;
  const H         = bbox.height - margin.top  - margin.bottom;

  const svg = d3.select('#timeline')
    .append('svg')
      .attr('viewBox', `0 0 ${W+margin.left+margin.right} ${H+margin.top+margin.bottom}`)
      .attr('preserveAspectRatio','xMinYMin meet')
    .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

  const color = {
    'Negative':'#d7191c',
    'Neutral' :'#fdae61',
    'Positive':'#1a9641'
  };

  d3.csv('data/sentiment_data.csv', d => ({
    date:      d3.timeDay.floor(new Date(d.date)),
    sentiment: +d.target===4?'Positive':(+d.target===2?'Neutral':'Negative')
  })).then(raw => {
    const roll = d3.rollups(
      raw, v=>v.length,
      d=>d.date,
      d=>d.sentiment
    );

    const days = roll.map(([date,m]) => {
      const o = { date };
      ['Negative','Neutral','Positive'].forEach(s => o[s] = 0);
      m.forEach(([s,c]) => o[s] = c);
      o.total = o.Negative + o.Neutral + o.Positive;
      return o;
    }).sort((a,b)=>a.date-b.date);

    const x = d3.scaleTime()
      .domain(d3.extent(days,d=>d.date))
      .range([0, W]);

    svg.append('g')
      .attr('class','axis')
      .attr('transform',`translate(0,${H})`)
      .call(d3.axisBottom(x).ticks(d3.timeMonth.every(2)));

    const glyphW = 20, glyphH = 20;
    const gGlyphs = svg.append('g').attr('class','glyphs');

    const glyph = gGlyphs.selectAll('.glyph')
      .data(days)
      .enter().append('g')
        .attr('class','glyph')
        .attr('transform', d=>`translate(${x(d.date)-glyphW/2},${H-glyphH-5})`);

    glyph.each(function(d){
      let x0 = 0;
      ['Negative','Neutral','Positive'].forEach(s => {
        const w = (d[s]/d.total)*glyphW;
        d3.select(this).append('rect')
          .attr('x', x0)
          .attr('y', 0)
          .attr('width', w)
          .attr('height', glyphH)
          .attr('fill', color[s]);
        x0 += w;
      });
    });

    const brush = d3.brushX()
      .extent([[0,0],[W,H]])
      .on('start brush end', ({selection}) => {
        if (!selection) {
          window.dispatchEvent(new CustomEvent('brushCleared'));
        } else {
          const [x0,x1] = selection.map(x.invert);
          window.dispatchEvent(new CustomEvent('timelineBrush',{
            detail:{start:x0,end:x1}
          }));
        }
      });

    svg.append('g').attr('class','brush').call(brush);
  });
})();
