'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

type Point = { date: string; views: number };

function formatDateLabel(isoDate: string) {
  // isoDate is YYYY-MM-DD
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ViewsChart({
  days = 30,
  endpoint = '/api/me/views',
  height = 240,
  compact = false,
}: {
  days?: number;
  endpoint?: string;
  height?: number;
  compact?: boolean;
}) {
  const [range, setRange] = useState(days);
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(640);
  const chartHeight = Math.max(80, height);
  const pad = compact ? 16 : 36;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Responsive width via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.max(320, Math.floor(e.contentRect.width));
        setWidth(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}days=${range}`;
        const res = await fetch(url, { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled) {
          if (res.ok) setData(Array.isArray(json.data) ? json.data : []);
          else setError(json?.error || 'Failed to load');
        }
      } catch {
        if (!cancelled) setError('Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const { path, areaPath, yMax, yTicks, stepX, points } = useMemo(() => {
    if (!data.length) {
      return {
        path: '',
        areaPath: '',
        yMax: 0,
        yTicks: [0],
        stepX: 0,
        points: [] as Array<{ x: number; y: number; d: Point }>,
      };
    }
    const max = Math.max(1, ...data.map((d) => d.views));
    const step = (width - pad * 2) / (data.length - 1);
    const scaleY = (v: number) =>
      chartHeight - pad - (v / max) * (chartHeight - pad * 2);
    const pts: Array<{ x: number; y: number; d: Point }> = [];
    let dStr = '';
    data.forEach((p, i) => {
      const x = pad + i * step;
      const y = scaleY(p.views);
      pts.push({ x, y, d: p });
      dStr += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    // Area under line
    const area = `${dStr} L ${pad + (data.length - 1) * step} ${chartHeight - pad} L ${pad} ${chartHeight - pad} Z`;
    // y-ticks at 0, 25%, 50%, 75%, 100%
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
    return {
      path: dStr,
      areaPath: area,
      yMax: max,
      yTicks: ticks,
      stepX: step,
      points: pts,
    };
  }, [data, width, chartHeight, pad]);

  const total = useMemo(
    () => data.reduce((s, p) => s + (p.views || 0), 0),
    [data]
  );
  const avg = useMemo(
    () => (data.length ? Math.round(total / data.length) : 0),
    [total, data.length]
  );

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!points.length) return;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const i = Math.round((x - pad) / stepX);
    const clamped = Math.min(points.length - 1, Math.max(0, i));
    setHoverIndex(clamped);
  };

  const handleLeave = () => setHoverIndex(null);

  return (
    <div
      className={`rounded-lg border bg-white ${compact ? 'p-2' : 'p-4'} space-y-4`}
    >
      {!compact && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="font-medium">Views</h4>
            <div className="text-xs text-gray-500">
              Total: {total.toLocaleString()} • Avg/day: {avg.toLocaleString()}
            </div>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                size="sm"
                variant={range === d ? 'secondary' : 'outline'}
                onClick={() => setRange(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <div ref={containerRef} className="relative w-full">
          <svg
            width={width}
            height={chartHeight}
            role="img"
            aria-label="Daily views chart"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
          >
            {/* Grid */}
            {!compact && (
              <g>
                {yTicks.map((tick, idx) => {
                  const y =
                    chartHeight -
                    pad -
                    (yMax === 0 ? 0 : (tick / yMax) * (chartHeight - pad * 2));
                  return (
                    <g key={idx}>
                      <line
                        x1={pad}
                        y1={y}
                        x2={width - pad}
                        y2={y}
                        stroke="#eef2f7"
                      />
                      <text
                        x={pad - 8}
                        y={y}
                        textAnchor="end"
                        dominantBaseline="middle"
                        className="fill-gray-500 text-[10px]"
                      >
                        {tick.toLocaleString()}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Axes */}
            {!compact && (
              <>
                <line
                  x1={pad}
                  y1={chartHeight - pad}
                  x2={width - pad}
                  y2={chartHeight - pad}
                  stroke="#e5e7eb"
                />
                <line
                  x1={pad}
                  y1={pad}
                  x2={pad}
                  y2={chartHeight - pad}
                  stroke="#e5e7eb"
                />
              </>
            )}

            {/* X-axis ticks/labels */}
            {!compact && points.length > 1 && (
              <g>
                {points.map((pt, i) => {
                  const step = Math.max(1, Math.ceil(points.length / 8));
                  if (i % step !== 0 && i !== points.length - 1) return null;
                  return (
                    <g key={i}>
                      <line
                        x1={pt.x}
                        y1={chartHeight - pad}
                        x2={pt.x}
                        y2={chartHeight - pad + 4}
                        stroke="#e5e7eb"
                      />
                      <text
                        x={pt.x}
                        y={chartHeight - pad + 16}
                        textAnchor="middle"
                        className="fill-gray-500 text-[10px]"
                      >
                        {formatDateLabel(pt.d.date)}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Area under line */}
            <path d={areaPath} fill="#3b82f620" />
            {/* Line */}
            <path d={path} fill="none" stroke="#2563eb" strokeWidth={2} />

            {/* Hover marker and tooltip */}
            {hoverIndex !== null && points[hoverIndex] && (
              <g>
                <line
                  x1={points[hoverIndex].x}
                  y1={pad}
                  x2={points[hoverIndex].x}
                  y2={chartHeight - pad}
                  stroke="#bfdbfe"
                />
                <circle
                  cx={points[hoverIndex].x}
                  cy={points[hoverIndex].y}
                  r={4}
                  fill="#2563eb"
                  stroke="#fff"
                  strokeWidth={2}
                />
                {/* Bottom-axis count label */}
                {!compact && (
                  <text
                    x={points[hoverIndex].x}
                    y={chartHeight - pad - 8}
                    textAnchor="middle"
                    className="fill-gray-700 text-[10px] font-medium"
                  >
                    {points[hoverIndex].d.views.toLocaleString()}
                  </text>
                )}
              </g>
            )}

            {/* Hover zones: make entire date column interactive */}
            {points.length > 0 && (
              <g>
                {points.map((pt, i) => {
                  const left = i === 0 ? pad : (points[i - 1].x + pt.x) / 2;
                  const right =
                    i === points.length - 1
                      ? width - pad
                      : (pt.x + points[i + 1].x) / 2;
                  const w = Math.max(1, right - left);
                  return (
                    <rect
                      key={i}
                      x={left}
                      y={pad}
                      width={w}
                      height={chartHeight - pad * 2}
                      fill="transparent"
                      onMouseEnter={() => setHoverIndex(i)}
                      onMouseMove={() => setHoverIndex(i)}
                      onFocus={() => setHoverIndex(i)}
                    />
                  );
                })}
              </g>
            )}
          </svg>

          {/* Tooltip element */}
          {hoverIndex !== null && points[hoverIndex] && (
            <div
              className="pointer-events-none absolute"
              style={{
                transform: `translate(${Math.max(8, Math.min(width - 160, points[hoverIndex].x))}px, ${Math.max(8, points[hoverIndex].y)}px)`,
              }}
            >
              <div className="rounded-md border bg-white px-3 py-2 shadow-sm">
                <div className="text-xs text-gray-500">
                  {formatDateLabel(points[hoverIndex].d.date)}
                </div>
                <div className="text-sm font-medium">
                  {points[hoverIndex].d.views.toLocaleString()} views
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
