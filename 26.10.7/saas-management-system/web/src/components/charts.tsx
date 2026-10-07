import type { ReactNode } from 'react';

export interface ChartPoint {
  label: string;
  value: number;
}

const PALETTE = ['#2f6feb', '#16a34a', '#d97706', '#0e7490', '#7c3aed', '#c2261d'];

/* ------------------------------------------------------------ 折线 / 面积图 */
export function LineChart({
  data,
  height = 170,
  color = '#2f6feb',
  showLabels = true,
}: {
  data: ChartPoint[];
  height?: number;
  color?: string;
  showLabels?: boolean;
}) {
  if (!data.length) return null;
  const W = 600;
  const H = height;
  const padTop = 12;
  const padBottom = 8;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = 0;
  const innerH = H - padTop - padBottom;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;

  const pts = data.map((d, i) => {
    const x = data.length > 1 ? i * stepX : W / 2;
    const y = padTop + innerH - ((d.value - min) / (max - min)) * innerH;
    return [x, y] as const;
  });

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H - padBottom} L0,${H - padBottom} Z`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height, display: 'block' }}
        role="img"
        aria-label="趋势折线图"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <line
            key={r}
            x1={0}
            x2={W}
            y1={padTop + innerH * r}
            y2={padTop + innerH * r}
            stroke="#e3e8f0"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={area} fill={color} opacity={0.08} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={2.5} fill={color} />
        ))}
      </svg>
      {showLabels && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--text-3)',
            marginTop: 6,
          }}
        >
          <span>{data[0].label}</span>
          {data.length > 2 && <span>{data[Math.floor(data.length / 2)].label}</span>}
          <span>{data[data.length - 1].label}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ 柱状图（纯 CSS） */
export function BarChart({ data, height = 170 }: { data: ChartPoint[]; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
        {data.map((d, i) => (
          <div key={d.label + i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div
              title={`${d.label}: ${d.value}`}
              style={{
                height: `${Math.max(3, (d.value / max) * (height - 24))}px`,
                background: PALETTE[i % PALETTE.length],
                borderRadius: '4px 4px 0 0',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        {data.map((d, i) => (
          <div
            key={d.label + i}
            style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ 环形图 */
export function DonutChart({
  data,
  size = 150,
  unit = '个',
  centerLabel,
}: {
  data: Array<{ name: string; value: number }>;
  size?: number;
  unit?: string;
  centerLabel?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;

  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox="0 0 140 140" role="img" aria-label="占比环形图">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#eef1f6" strokeWidth={18} />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = (
            <circle
              key={d.name}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={18}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += len;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="600" fill="#14203a">
          {centerLabel ?? total}
        </text>
        <text x="70" y="84" textAnchor="middle" fontSize="11" fill="#64748b">
          {unit}
        </text>
      </svg>
      <div style={{ display: 'grid', gap: 8, flex: 1, minWidth: 120 }}>
        {data.map((d, i) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span
              style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[i % PALETTE.length], flexShrink: 0 }}
            />
            <span style={{ flex: 1 }}>{d.name}</span>
            <b>{d.value}</b>
            <span className="muted small">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ 进度条 */
export function ProgressBar({ value, label }: { value: number; label?: ReactNode }) {
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 90 ? 'var(--danger)' : v >= 70 ? 'var(--warning)' : 'var(--primary)';
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span>{label}</span>
          <span className="muted">{v}%</span>
        </div>
      )}
      <div style={{ height: 6, background: '#eef1f6', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${v}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}
