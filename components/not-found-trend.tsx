'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Brush,
} from 'recharts';

export type TrendPoint = { day: string; hits: number };

export default function NotFoundTrend({
  data,
  onSelectDay,
}: {
  data: TrendPoint[];
  onSelectDay?: (day: string) => void;
}) {
  const { max, avg } = useMemo(() => {
    const values = data?.map((d) => d.hits) || [];
    const max = values.length ? Math.max(...values) : 0;
    const avg = values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
    return { max, avg };
  }, [data]);

  const Dot = (props: any) => {
    const { cx, cy, payload, value } = props;
    const isMax = value === max && max > 0;
    const r = isMax ? 4 : 2.5;
    const fill = isMax ? 'hsl(var(--destructive))' : 'hsl(var(--primary))';
    return (
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke="white"
        strokeWidth={1}
        onClick={() => onSelectDay?.(payload.day)}
        style={{ cursor: onSelectDay ? 'pointer' : 'default' }}
      />
    );
  };

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
        >
          <defs>
            <linearGradient id="colorHits" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--muted-foreground))"
            opacity={0.3}
          />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12 }}
            tickMargin={6}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            allowDecimals={false}
            width={32}
            tick={{ fontSize: 12 }}
            tickMargin={6}
          />
          <Tooltip
            formatter={(v: any) => [v, 'Hits']}
            labelFormatter={(l) => `Date: ${l}`}
          />
          {avg > 0 && (
            <ReferenceLine
              y={avg}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 3"
              label={{
                value: `avg ${avg.toFixed(1)}`,
                position: 'right',
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 12,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="hits"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={<Dot />}
            activeDot={{ r: 5 }}
          />
          <Brush
            dataKey="day"
            height={20}
            travellerWidth={8}
            className="mt-2"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
