"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
} from "recharts";
import type { MatrixPoint } from "@/lib/api";
import { MECHANISM_COLORS } from "@/lib/chart-colors";

interface CompetitiveBubbleChartProps {
  data: MatrixPoint[];
  highlightMechanism?: string | null;
}

export function CompetitiveBubbleChart({ data, highlightMechanism }: CompetitiveBubbleChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    z: Math.max(d.trial_count * 20, 40),
  }));

  return (
    <div
      className="h-80 w-full outline-none [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none"
      onMouseDown={(e) => e.preventDefault()}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 8 }}>
          <XAxis
            type="number"
            dataKey="maturity"
            name="Clinical Maturity"
            domain={[0, 80]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            label={{ value: "Clinical maturity", position: "bottom", fill: "#64748b", fontSize: 11, offset: 0 }}
          />
          <YAxis
            type="number"
            dataKey="differentiation"
            name="Differentiation"
            domain={[0, 100]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
            label={{ value: "Differentiation", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 11 }}
          />
          <ZAxis type="number" dataKey="z" range={[40, 400]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: "#cbd5e1" }}
            content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload as MatrixPoint;
              return (
                <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-sm">
                  <p className="font-medium">{d.name}</p>
                  <p className="text-muted-foreground">{d.mechanism}</p>
                  <p className="text-muted-foreground">Momentum: {d.momentum_score}</p>
                </div>
              );
            }}
          />
          <Scatter data={chartData} isAnimationActive={false}>
            {chartData.map((entry, i) => {
              const color = MECHANISM_COLORS[entry.mechanism] || MECHANISM_COLORS.Other;
              const isHighlighted = highlightMechanism && entry.mechanism === highlightMechanism;
              return (
                <Cell
                  key={i}
                  fill={color}
                  fillOpacity={highlightMechanism ? (isHighlighted ? 0.95 : 0.3) : 0.75}
                  stroke={isHighlighted ? color : "transparent"}
                  strokeWidth={isHighlighted ? 2 : 0}
                />
              );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
