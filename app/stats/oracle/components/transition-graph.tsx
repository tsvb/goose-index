"use client";

import { useMemo } from "react";
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from "recharts";

type TransitionGraphProps = {
  data: {
    source_name: string;
    target_name: string;
    count: number;
  }[];
};

export function TransitionGraph({ data }: TransitionGraphProps) {
  // Convert flat transition data to nodes/links for Sankey
  const chartData = useMemo(() => {
    const nodes: { name: string }[] = [];
    const links: { source: number; target: number; value: number }[] = [];
    
    // We only want to visualize the top 15 transitions to avoid clutter
    const topTransitions = data.slice(0, 15);

    topTransitions.forEach((t) => {
      let sourceIdx = nodes.findIndex((n) => n.name === t.source_name);
      if (sourceIdx === -1) {
        sourceIdx = nodes.length;
        nodes.push({ name: t.source_name });
      }

      let targetIdx = nodes.findIndex((n) => n.name === t.target_name);
      if (targetIdx === -1) {
        targetIdx = nodes.length;
        nodes.push({ name: t.target_name });
      }

      links.push({
        source: sourceIdx,
        target: targetIdx,
        value: t.count,
      });
    });

    return { nodes, links };
  }, [data]);

  // Custom node renderer for Sankey
  const renderSankeyNode = (props: any) => {
    const { x, y, width, height, index, payload } = props;
    const isSource = chartData.links.some(l => l.source === index);
    
    return (
      <Layer key={`CustomNode${index}`}>
        <Rectangle
          x={x}
          y={y}
          width={width}
          height={height}
          fill="var(--color-surface-hover)"
          stroke="var(--color-gold)"
          strokeOpacity={0.5}
        />
        <text
          textAnchor={isSource ? "end" : "start"}
          x={isSource ? x - 6 : x + width + 6}
          y={y + height / 2}
          fontSize="12"
          fontFamily="var(--font-mono)"
          fill="var(--color-ink)"
          alignmentBaseline="middle"
        >
          {payload.name}
        </text>
      </Layer>
    );
  };

  return (
    <div className="surface-card p-6 h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={chartData}
          nodePadding={50}
          margin={{
            left: 100,
            right: 100,
            top: 20,
            bottom: 20,
          }}
          link={{ stroke: 'var(--color-gold)', strokeOpacity: 0.2 }}
          node={renderSankeyNode}
        >
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                if (data.source && data.target) {
                  // It's a link tooltip
                  return (
                    <div className="bg-surface border border-line-soft p-3 rounded-lg shadow-xl backdrop-blur-md">
                      <p className="font-display text-ink text-sm">
                        {data.source.name} <span className="text-gold">→</span> {data.target.name}
                      </p>
                      <p className="text-muted text-xs mt-1 font-mono">
                        Transitioned <span className="text-gold">{data.value}</span> times
                      </p>
                    </div>
                  );
                }
              }
              return null;
            }}
          />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
