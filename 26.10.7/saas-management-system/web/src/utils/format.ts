export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `¥${Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return Number(value).toLocaleString('zh-CN');
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fromNow(iso: string | null | undefined): string {
  if (!iso) return '从未登录';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} 天前`;
  return formatDate(iso);
}

export const TENANT_STATUS: Record<string, { text: string; tone: 'success' | 'danger' }> = {
  active: { text: '正常', tone: 'success' },
  suspended: { text: '已停用', tone: 'danger' },
};

export const SUBSCRIPTION_STATUS: Record<
  string,
  { text: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'default' }
> = {
  active: { text: '有效', tone: 'success' },
  trialing: { text: '试用中', tone: 'info' },
  past_due: { text: '逾期', tone: 'warning' },
  canceled: { text: '已取消', tone: 'danger' },
};

export const INVOICE_STATUS: Record<
  string,
  { text: string; tone: 'success' | 'warning' | 'danger' | 'default' }
> = {
  paid: { text: '已支付', tone: 'success' },
  open: { text: '待支付', tone: 'warning' },
  void: { text: '已作废', tone: 'default' },
  free: { text: '免费', tone: 'default' },
};
