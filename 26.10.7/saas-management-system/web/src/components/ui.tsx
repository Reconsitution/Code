import type { CSSProperties, ReactNode } from 'react';

/* ------------------------------------------------------------ 卡片 */
export function Card({
  title,
  extra,
  children,
  padded = true,
  style,
}: {
  title?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  style?: CSSProperties;
}) {
  return (
    <section className="card" style={style}>
      {title !== undefined && (
        <header className="card-head">
          <div className="card-title">{title}</div>
          {extra && <div>{extra}</div>}
        </header>
      )}
      <div className={padded ? 'card-body' : 'card-body tight'}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------ 统计卡 */
const TONE_BG: Record<string, string> = {
  primary: 'var(--primary-soft)',
  success: 'var(--success-soft)',
  warning: 'var(--warning-soft)',
  danger: 'var(--danger-soft)',
  info: 'var(--info-soft)',
};
const TONE_FG: Record<string, string> = {
  primary: 'var(--primary-dark)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)',
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'primary',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}) {
  return (
    <div className="stat">
      <div className="stat-label">
        {icon && (
          <span
            className="stat-accent"
            style={{ background: TONE_BG[tone], color: TONE_FG[tone], width: 24, height: 24, fontSize: 13 }}
          >
            {icon}
          </span>
        )}
        {label}
      </div>
      <div className="stat-value">{value}</div>
      {hint !== undefined && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

/* ------------------------------------------------------------ 徽标 */
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'primary';

export function Badge({ tone = 'default', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

/* ------------------------------------------------------------ 提示条 */
export function Alert({ tone = 'error', children }: { tone?: 'error' | 'info'; children: ReactNode }) {
  return <div className={`alert alert-${tone}`}>{children}</div>;
}

/* ------------------------------------------------------------ 弹窗 */
export function Modal({
  title,
  onClose,
  footer,
  children,
  maxWidth,
}: {
  title: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" style={maxWidth ? { maxWidth } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b style={{ fontSize: 15 }}>{title}</b>
          <button className="btn btn-text" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ 表单字段 */
export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

/* ------------------------------------------------------------ 空态 / 加载 */
export function Empty({ text = '暂无数据' }: { text?: string }) {
  return <div className="empty">{text}</div>;
}

export function Loading({ text = '加载中…' }: { text?: string }) {
  return (
    <div className="loading-block">
      <span className="spinner" />
      {text}
    </div>
  );
}

/* ------------------------------------------------------------ 分页 */
export function Pager({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return <div className="pager">共 0 条</div>;
  return (
    <div className="pager">
      <span>
        共 {total} 条 · 第 {page}/{pages} 页
      </span>
      <button className="btn btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        上一页
      </button>
      <button className="btn btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        下一页
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ 标签页 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="tabs">
      {items.map((it) => (
        <button
          key={it.value}
          className={`tab ${it.value === value ? 'is-active' : ''}`}
          onClick={() => onChange(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
