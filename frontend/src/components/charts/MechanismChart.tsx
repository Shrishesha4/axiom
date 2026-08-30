"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { MECHANISM_CHART_COLORS } from "@/lib/chart-colors";

interface MechanismChartProps {
  data: Record<string, number>;
}

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

export function MechanismChart({ data }: MechanismChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));

  return (
    <div className="w-full [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none">
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="78%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              isAnimationActive={false}
            >
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={MECHANISM_CHART_COLORS[i % MECHANISM_CHART_COLORS.length]}
                  fillOpacity={0.9}
                />
              ))}
            </Pie>
            <Tooltip
              cursor={false}
              contentStyle={tooltipStyle}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-3 px-2">
        {chartData.slice(0, 6).map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: MECHANISM_CHART_COLORS[i % MECHANISM_CHART_COLORS.length] }}
            />
            <span className="truncate max-w-[100px]">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
