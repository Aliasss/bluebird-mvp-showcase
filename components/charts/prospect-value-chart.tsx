'use client';

import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useIsDark } from '@/lib/theme';

type CurvePoint = {
  x: number;
  y: number;
};

type UserPoint = {
  x: number;
  y: number;
  label: string;
};

interface ProspectValueChartProps {
  curveData: CurvePoint[];
  userPoint: UserPoint;
}

export default function ProspectValueChart({ curveData, userPoint }: ProspectValueChartProps) {
  const [isMobile, setIsMobile] = useState(false);
  const isDark = useIsDark();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  const yValues = [...curveData.map((p) => p.y), userPoint.y].filter(Number.isFinite);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yPadding = Math.max(0.3, (yMax - yMin) * 0.12);

  const chartMargin = isMobile
    ? { top: 10, right: 8, left: 4, bottom: 28 }
    : { top: 20, right: 20, left: 8, bottom: 36 };

  return (
    <div className="w-full h-[260px] sm:h-[320px] md:h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={curveData} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E5E7EB'} />
          <XAxis
            type="number"
            dataKey="x"
            domain={[-1, 1]}
            ticks={[-1, -0.5, 0, 0.5, 1]}
            tick={{ fontSize: isMobile ? 10 : 12 }}
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            label={{
              value: isMobile ? '사건 평가 (손실←0→이득)' : '객관적 사건 평가 (손실 ← 0 → 이득)',
              position: 'insideBottom',
              offset: isMobile ? -16 : -20,
              style: { fontSize: isMobile ? 10 : 12, fill: isDark ? '#94A3B8' : '#6B7280' },
            }}
          />
          <YAxis
            type="number"
            width={isMobile ? 52 : 64}
            domain={[yMin - yPadding, yMax + yPadding]}
            tickCount={5}
            tick={{ fontSize: isMobile ? 10 : 12 }}
            tickFormatter={(v) => Number(v).toFixed(2)}
            label={{
              value: '주관적 가치',
              angle: -90,
              position: 'insideLeft',
              offset: isMobile ? 14 : 18,
              style: { fontSize: isMobile ? 10 : 11, fill: isDark ? '#94A3B8' : '#6B7280', textAnchor: 'middle' },
            }}
          />
          <Tooltip
            contentStyle={{ fontSize: isMobile ? '10px' : '12px' }}
            formatter={(value: unknown) =>
              typeof value === 'number' ? value.toFixed(2) : String(value ?? '')
            }
            labelFormatter={(value) => `x=${(Number(value) * 100).toFixed(0)}%`}
          />
          <ReferenceLine x={0} stroke={isDark ? '#475569' : '#9CA3AF'} />
          <ReferenceLine y={0} stroke={isDark ? '#475569' : '#9CA3AF'} />
          <Line
            data={curveData}
            dataKey="y"
            type="monotone"
            stroke={isDark ? '#52B788' : '#2D6A4F'}
            strokeWidth={3}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={userPoint.x}
            y={userPoint.y}
            r={6}
            fill={isDark ? '#FB7185' : '#E11D48'}
            stroke={isDark ? '#1E293B' : '#FFFFFF'}
            strokeWidth={2}
            ifOverflow="visible"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
