"use client";
import * as React from 'react';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';

type Point = { t: string; biasScore: number | null; confidence: number | null };

export function ChartLineInteractive({ data }: { data: Point[] }) {
  const fmtX = (iso: string) => new Date(iso).toLocaleDateString();
  const fmtUTC = (iso: string) => new Date(iso).toUTCString();

  const TooltipContent = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0 || !label) return null;
    const bias = payload.find((p) => p.dataKey === 'biasScore')?.value;
    const conf = payload.find((p) => p.dataKey === 'confidence')?.value;
    return (
      <div className="rounded-md border bg-white p-2 text-xs shadow-sm">
        <div className="text-gray-600">{fmtUTC(String(label))}</div>
        <div className="mt-1 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#2563eb' }} />
            <span>Bias:</span>
            <span className="font-medium">{typeof bias === 'number' ? bias.toFixed(2) : '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#16a34a' }} />
            <span>Confidence:</span>
            <span className="font-medium">{typeof conf === 'number' ? conf.toFixed(2) : '—'}</span>
          </div>
        </div>
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-72 grid place-items-center text-sm text-gray-500 border rounded-md">
        No data yet for this subreddit.
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 12, right: 12, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="t" tickFormatter={fmtX} minTickGap={24} />
          <YAxis domain={[0, 10]} tickCount={6} />
          <YAxis yAxisId={1} orientation="right" domain={[0, 1]} tickCount={6} />
          <Tooltip content={<TooltipContent />} />
          <Legend verticalAlign="top" height={24} />
          <Line type="monotone" dataKey="biasScore" stroke="#2563eb" strokeWidth={2} dot={false} name="Bias" connectNulls />
          <Line type="monotone" dataKey="confidence" stroke="#16a34a" strokeWidth={2} dot={false} name="Confidence" yAxisId={1} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
