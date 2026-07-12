"use client";

import { useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

type SundayStatsProps = {
  data: {
    dow: number;
    day_name: string;
    total_shows: number;
    avg_jams: number;
  }[];
};

export function SundayStats({ data }: SundayStatsProps) {
  // Map data to chart format, ordering nicely for a circle (Mon-Sun)
  const chartData = useMemo(() => {
    const ordered = [...data].sort((a, b) => {
      // Shift Sunday (0) to the end (7) for Mon-Sun order
      const dowA = a.dow === 0 ? 7 : a.dow;
      const dowB = b.dow === 0 ? 7 : b.dow;
      return dowA - dowB;
    });

    return ordered.map((d) => ({
      name: d.day_name.substring(0, 3),
      avgJams: Number(d.avg_jams),
      totalShows: d.total_shows,
      fullDay: d.day_name
    }));
  }, [data]);

  return (
    <div className="surface-card p-6 h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="var(--color-line-soft)" />
          <PolarAngleAxis 
            dataKey="name" 
            tick={{ fill: "var(--color-faint)", fontSize: 12, fontFamily: "var(--font-mono)" }} 
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 'auto']} 
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
            axisLine={false}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-surface border border-line-soft p-3 rounded-lg shadow-xl backdrop-blur-md">
                    <p className="font-display text-ink text-lg">{data.fullDay}</p>
                    <p className="text-muted text-sm mt-1">
                      <span className="text-gold font-mono">{data.avgJams.toFixed(2)}</span> avg jams/show
                    </p>
                    <p className="text-faint text-xs font-mono mt-1">
                      Across {data.totalShows} shows
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Radar
            name="Avg Jams"
            dataKey="avgJams"
            stroke="var(--color-gold)"
            fill="var(--color-gold)"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
