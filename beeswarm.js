;(function(){
  const container = d3.select('#beeswarm').node();
  const bbox = container.getBoundingClientRect();
  const margin = { top: 20, right: 20, bottom: 60, left: 60 };

  // compute W/H from the actual container size:
  const W = bbox.width  - margin.left - margin.right;
  const H = 600 /* or you can likewise compute clientHeight */ 
            - margin.top - margin.bottom;

  const svg = d3.select('#beeswarm')
    .append('svg')
      // set a viewBox so scaling works nicely
      .attr('viewBox', `0 0 ${W+margin.left+margin.right} ${H+margin.top+margin.bottom}`)
      .attr('preserveAspectRatio', 'xMinYMin meet')
    .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

  const tooltip = d3.select('.tooltip');

  d3.csv('data/sentiment_data.csv', d => ({
    date:      new Date(d.date),
    company:   d.company_tag,
    sentiment: +d.target === 4 ? 'Positive'
              : +d.target === 2 ? 'Neutral'
                                : 'Negative',
    region:    d.loc.split(',').pop().trim(),
    text:      d.text,
    length:    d.text.length
  })).then(data => {
    const services   = Array.from(new Set(data.map(d=>d.company)));
    const sentiments = ['Negative','Neutral','Positive'];

    // Scales
    const y = d3.scaleTime()
      .domain(d3.extent(data, d=>d.date)).nice()
      .range([H,0]);

    const laneX = d3.scalePoint()
      .domain(services)
      .range([0,W])
      .padding(0.5);

    const color = d3.scaleOrdinal()
      .domain(sentiments)
      .range(['#d7191c','#fdae61','#1a9641']);

    // LEFT: time axis
    svg.append('g')
      .attr('class','axis')
      .call(d3.axisLeft(y));

    // BOTTOM: company axis
    svg.append('g')
      .attr('class','axis')
      .attr('transform', `translate(0,${H})`)
      .call(d3.axisBottom(laneX))
      .selectAll('text')
      .attr('text-anchor','middle')
      .attr('dy','1em');

    // force layout to compute d.x,d.y
    const sim = d3.forceSimulation(data)
      .force('y',       d3.forceY(d=>y(d.date)).strength(1))
      .force('x',       d3.forceX(d=>laneX(d.company)).strength(1))
      .force('collide', d3.forceCollide(d=>2 + d.length/200 + 1))
      .stop();
    for (let i = 0; i < 150; i++) sim.tick();

    // draw circles
    const circles = svg.append('g')
      .selectAll('circle')
      .data(data)
      .enter().append('circle')
        .attr('cx', d=>d.x)
        .attr('cy', d=>d.y)
        .attr('r',  d=>2 + d.length/200)
        .attr('fill', d=>color(d.sentiment))
        .attr('opacity', 0.7)
        .on('mouseover', (e,d) => {
          tooltip
            .style('opacity', 1)
            .html(`${d.company} | ${d.sentiment} | ${d.region}<br/>${d.text}`);
        })
        .on('mousemove', e => {
          tooltip
            .style('left',  `${e.pageX + 5}px`)
            .style('top',   `${e.pageY - 25}px`);
        })
        .on('mouseout', () => {
          tooltip.style('opacity', 0);
        })
        .on('click', (e,d) => {
          svg.select('.brush').call(brush.move, null);
          window.dispatchEvent(
            new CustomEvent('beeswarmClick',{detail:d.company})
          );
        });

    // vertical brush
    const brush = d3.brushY()
      .extent([[0,0],[W,H]])
      .on('start brush', ({selection}) => {
        if (selection) {
          const [y0,y1] = selection.map(y.invert);
          circles.attr('opacity', d =>
            d.date >= y0 && d.date <= y1 ? 0.7 : 0.1
          );
        }
      })
      .on('end', ({selection}) => {
        if (!selection) {
          circles.attr('opacity', 0.7);
          window.dispatchEvent(new CustomEvent('brushCleared'));
        }
      });

    svg.append('g')
      .attr('class','brush')
      .call(brush);

    // respond to Sankey clicks
    window.addEventListener('sankeyNodeClick', e => {
      const node = e.detail.node;
      circles.attr('opacity', d =>
        (d.company===node || d.sentiment===node || d.region===node)
          ? 0.7 : 0.1
      );
    });

    // clear on outside click
    d3.select('body').on('click', (e) => {
      if (e.target.tagName === 'svg') {
        circles.attr('opacity', 0.7);
        svg.select('.brush').call(brush.move, null);
        window.dispatchEvent(new CustomEvent('brushCleared'));
      }
    });
  });
})();
