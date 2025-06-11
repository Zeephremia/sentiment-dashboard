;(function(){
  const svgEl = d3.select('#sankey');
  const { width: W, height: H } = svgEl.node().getBoundingClientRect();
  const teal = '#66c2a5';
  const sentimentColor = {
    'Negative': '#d7191c',
    'Neutral':  '#fdae61',
    'Positive': '#1a9641'
  };

  const svg = svgEl
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio','xMinYMin meet');

  d3.csv('data/sentiment_data.csv', d => ({
    date:      new Date(d.date),
    company:   d.company_tag,
    sentiment: +d.target===4 ? 'Positive'
              : +d.target===2 ? 'Neutral'
                               : 'Negative',
    region:    d.loc.split(',').pop().trim()
  })).then(raw => {
    const nodeMap = new Map(), nodes = [], links = [];
    function addNode(n) {
      if (!nodeMap.has(n)) {
        nodeMap.set(n, nodes.length);
        nodes.push({ name: n });
      }
      return nodeMap.get(n);
    }

    raw.forEach(d => {
      const a = addNode(d.company),
            b = addNode(d.sentiment),
            c = addNode(d.region);

      links.push({ source:a, target:b, value:1, sentiment:d.sentiment, date:d.date });
      links.push({ source:b, target:c, value:1, sentiment:d.sentiment, date:d.date });
    });

    const agg = new Map();
    links.forEach(l => {
      const key = `${l.source}|${l.target}|${l.sentiment}`;
      if (!agg.has(key)) {
        agg.set(key, { source:l.source, target:l.target, sentiment:l.sentiment, value:0, dates:[] });
      }
      const rec = agg.get(key);
      rec.value += 1;
      rec.dates.push(l.date);
    });

    const flatLinks = Array.from(agg.values());

    const { nodes:sn, links:sl } = d3.sankey()
      .nodeWidth(20).nodePadding(10)
      .extent([[1,1],[W-1,H-6]])
      ({ nodes, links: flatLinks });

    svg.append('g').selectAll('path')
      .data(sl).enter().append('path')
        .attr('class','link')
        .attr('d', d3.sankeyLinkHorizontal())
        .attr('stroke-width', d => Math.max(1, d.width))
        .attr('stroke', d => sentimentColor[d.sentiment])
        .attr('fill','none')
        .attr('opacity', 0.7);

    const nd = svg.append('g').selectAll('g')
      .data(sn).enter().append('g').attr('class','node');

    nd.append('rect')
      .attr('x',      d=>d.x0)
      .attr('y',      d=>d.y0)
      .attr('width',  d=>d.x1-d.x0)
      .attr('height', d=>d.y1-d.y0)
      .attr('fill',   d=> sentimentColor[d.name] || teal )
      .attr('stroke', '#333')
      .on('click', (e,d) => {
        svg.selectAll('.link').transition().duration(300)
          .attr('opacity', l =>
            l.source.index===d.index || l.target.index===d.index ? 0.9 : 0.1
          );
        window.dispatchEvent(new CustomEvent('sankeyNodeClick', { detail:{ node:d.name }}));
      });

    nd.append('text')
      .attr('x',           d=>d.x0-6)
      .attr('y',           d=> (d.y0 + d.y1)/2)
      .attr('dy',          '0.35em')
      .attr('text-anchor', 'end')
      .text(d=>d.name);

    window.addEventListener('timelineBrush', e => {
      const { start, end } = e.detail;
      svg.selectAll('.link').transition().duration(300)
        .attr('opacity', link =>
          link.dates.some(dt => dt >= start && dt <= end) ? 0.9 : 0.1
        );
    });

    window.addEventListener('brushCleared', () => {
      svg.selectAll('.link').transition().duration(300).attr('opacity', 0.7);
    });
  });
})();
