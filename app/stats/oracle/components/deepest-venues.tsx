"use client";

import { useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type DeepestVenuesProps = {
  data: {
    name: string;
    total_shows: number;
    total_performances: number;
    total_jams: number;
    jam_percentage: number;
  }[];
};

export function DeepestVenues({ data }: DeepestVenuesProps) {
  // Map data to chart format
  const chartData = useMemo(() => {
    return data.map((d) => ({
      name: d.name,
      x: d.total_shows,
      y: Number(d.jam_percentage),
      z: d.total_jams, // size of dot
      totalJams: d.total_jams,
      totalPerformances: d.total_performances
    }));
  }, [data]);

  return (
    <div className="surface-card p-6 h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 0,
          }}
        >
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Total Shows" 
            tick={{ fill: "var(--color-faint)", fontSize: 12, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "var(--color-line-soft)" }}
            tickLine={false}
            label={{ value: 'Total Shows Played', position: 'insideBottom', offset: -10, fill: "var(--color-faint)", fontSize: 12 }}
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Jam %" 
            tick={{ fill: "var(--color-faint)", fontSize: 12, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "var(--color-line-soft)" }}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
            label={{ value: 'Jam Frequency', angle: -90, position: 'insideLeft', fill: "var(--color-faint)", fontSize: 12 }}
          />
          <ZAxis type="number" dataKey="z" range={[50, 400]} name="Total Jams" />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-surface border border-line-soft p-3 rounded-lg shadow-xl backdrop-blur-md">
                    <p className="font-display text-ink text-lg">{data.name}</p>
                    <p className="text-muted text-sm mt-1">
                      <span className="text-gold font-mono">{data.y}%</span> of songs are jammed
                    </p>
                    <p className="text-faint text-xs font-mono mt-1">
                      {data.totalJams} jams out of {data.totalPerformances} performances across {data.x} shows
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter name="Venues" data={chartData} fill="var(--color-gold)">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="var(--color-gold)" fillOpacity={0.6} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
