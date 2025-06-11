;(function(){
  const W = 500, H = 400,
        serviceColor = '#66c2a5', // teal for services & regions
        regionColor  = '#66c2a5';

  const sentimentColor = {
    'Negative': '#d7191c',
    'Neutral':  '#fdae61',
    'Positive': '#1a9641'
  };

  const svg = d3.select('#sankey')
    .append('svg')
      .attr('width', W)
      .attr('height', H);

  d3.csv('data/sentiment_data.csv', d=>({
    company:   d.company_tag,
    sentiment: +d.target===4?'Positive':(+d.target===2?'Neutral':'Negative'),
    region:    d.loc.split(',').pop().trim()
  })).then(raw => {
    // build nodes & links
    const nodeMap = new Map(),
          nodes   = [],
          links   = [];

    function addNode(name) {
      if (!nodeMap.has(name)) {
        nodeMap.set(name, nodes.length);
        nodes.push({ name });
      }
      return nodeMap.get(name);
    }

    raw.forEach(d => {
      const a = addNode(d.company),
            b = addNode(d.sentiment),
            c = addNode(d.region);
      links.push({ source: a, target: b, value: 1, sentiment: d.sentiment });
      links.push({ source: b, target: c, value: 1, sentiment: d.sentiment });
    });

    // aggregate duplicates
    const agg = new Map();
    links.forEach(l => {
      const key = `${l.source}|${l.target}|${l.sentiment}`;
      agg.set(key, (agg.get(key) || 0) + l.value);
    });
    const flatLinks = Array.from(agg.entries()).map(([k,v]) => {
      const [s,t,sent] = k.split('|');
      return { source:+s, target:+t, value:v, sentiment:sent };
    });

    // Sankey layout
    const { nodes: sn, links: sl } = d3.sankey()
      .nodeWidth(20)
      .nodePadding(10)
      .extent([[1,1],[W-1,H-6]])
      ({ nodes, links: flatLinks });

    // draw links
    svg.append('g').selectAll('path')
      .data(sl)
      .enter().append('path')
        .attr('class','link')
        .attr('d', d3.sankeyLinkHorizontal())
        .attr('stroke-width', d => Math.max(1, d.width))
        .attr('stroke', d => sentimentColor[d.sentiment])
        .attr('opacity', 0.7);

    // draw nodes
    const nd = svg.append('g').selectAll('g')
      .data(sn)
      .enter().append('g')
        .attr('class','node');

    nd.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('height', d => d.y1 - d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('fill', d => {
        // color sentiment nodes, else teal
        return sentimentColor[d.name] || serviceColor;
      })
      .attr('stroke','#333');

    nd.append('text')
      .attr('x', d => d.x0 - 6)
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('dy','0.35em')
      .attr('text-anchor','end')
      .text(d => d.name);

    // Clicking a node clears any brush and highlights its links
    nd.selectAll('rect').on('click', (e,d) => {
      svg.selectAll('.link').attr('opacity', l =>
        (l.source.index===d.index || l.target.index===d.index) ? 0.9 : 0.1
      );
      // notify beeswarm to reset or filter
      window.dispatchEvent(new CustomEvent('sankeyNodeClick',{detail:{node:d.name}}));
    });

    // Listen for brush clear to reset
    window.addEventListener('brushCleared', () => {
      svg.selectAll('.link').attr('opacity', 0.7);
    });
  });
})();
