"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PHASE_COLORS } from "@/lib/chart-colors";

interface PhaseChartProps {
  data: Record<string, number>;
}

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

export function PhaseChart({ data }: PhaseChartProps) {
  const chartData = Object.entries(data).map(([phase, count]) => ({
    phase: phase.replace("PHASE", "Phase "),
    count,
    key: phase,
  }));

  return (
    <div className="h-52 w-full [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 12, bottom: 8, left: -16 }}
        >
          <XAxis
            dataKey="phase"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            cursor={{ fill: "transparent" }}
            contentStyle={tooltipStyle}
            labelStyle={{ color: "#334155", fontWeight: 500 }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} activeBar={false} isAnimationActive={false}>
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={PHASE_COLORS[entry.key] || PHASE_COLORS.UNKNOWN} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
