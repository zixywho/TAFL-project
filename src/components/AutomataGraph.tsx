import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Automaton } from '../types';

interface AutomataGraphProps {
  automaton: Automaton;
  width?: number;
  height?: number;
  highlightState?: string;
}

const AutomataGraph: React.FC<AutomataGraphProps> = ({ 
  automaton, 
  width = 600, 
  height = 400,
  highlightState 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const nodes = automaton.states.map((id) => ({ id }));
    const links: any[] = [];

    // Group transitions by from/to pairs to handle multiple symbols on one edge
    const transitionGroups = new Map<string, string[]>();
    automaton.transitions.forEach((t) => {
      t.to.forEach((toState) => {
        const key = `${t.from}->${toState}`;
        if (!transitionGroups.has(key)) {
          transitionGroups.set(key, []);
        }
        transitionGroups.get(key)!.push(t.symbol || 'ε');
      });
    });

    transitionGroups.forEach((symbols, key) => {
      const [source, target] = key.split('->');
      links.push({
        source,
        target,
        label: symbols.join(', '),
      });
    });

    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));

    // Arrowhead marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#999')
      .style('stroke', 'none');

    const linkGroup = svg.append('g');
    const nodeGroup = svg.append('g');

    const link = linkGroup.selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    const linkLabel = linkGroup.selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .attr('font-size', '12px')
      .attr('fill', '#555')
      .attr('text-anchor', 'middle')
      .text((d) => d.label);

    const node = nodeGroup.selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    node.append('circle')
      .attr('r', 20)
      .attr('fill', (d: any) => d.id === highlightState ? '#10b981' : '#161b22')
      .attr('stroke', (d: any) => automaton.finalStates.includes(d.id) ? '#ef4444' : '#30363d')
      .attr('stroke-width', (d: any) => automaton.finalStates.includes(d.id) ? 3 : 2);

    // Double circle for final states
    node.filter((d: any) => automaton.finalStates.includes(d.id))
      .append('circle')
      .attr('r', 16)
      .attr('fill', 'none')
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 1);

    node.append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', (d: any) => d.id === highlightState ? '#000' : '#e6edf3')
      .text((d: any) => d.id);

    // Start state arrow
    const startArrow = svg.append('path')
      .attr('stroke', '#7c3aed')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    simulation.on('tick', () => {
      link.attr('d', (d: any) => {
        if (d.source.id === d.target.id) {
          const x = d.source.x;
          const y = d.source.y;
          const dr = 30;
          return `M ${x+10},${y-15} A ${dr},${dr} 0 1,1 ${x+20},${y+10}`;
        }
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        const isBiDirectional = links.some(l => l.source.id === d.target.id && l.target.id === d.source.id);
        if (isBiDirectional) {
            return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
        }
        return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;
      });

      linkLabel.attr('x', (d: any) => {
        if (d.source.id === d.target.id) return d.source.x + 40;
        return (d.source.x + d.target.x) / 2;
      }).attr('y', (d: any) => {
        if (d.source.id === d.target.id) return d.source.y - 40;
        return (d.source.y + d.target.y) / 2 - 5;
      }).attr('fill', '#848d97');

      node.attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);

      const startNode = nodes.find(n => n.id === automaton.startState) as any;
      if (startNode && startNode.x !== undefined) {
        startArrow.attr('d', `M ${startNode.x - 60},${startNode.y} L ${startNode.x - 25},${startNode.y}`);
      }
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => simulation.stop();
  }, [automaton, width, height, highlightState]);

  return (
    <div className="overflow-hidden">
      <svg ref={svgRef} width={width} height={height} className="bg-transparent" />
    </div>
  );
};

export default AutomataGraph;
