import { useState } from 'react';
import { billingApi } from '../api';
import { useRequest } from '../hooks/useRequest';
import { Alert, Badge, Card, Empty, Loading, Pager, StatCard } from '../components/ui';
import { BarChart } from '../components/charts';
import { formatDate, formatMoney, formatNumber, INVOICE_STATUS } from '../utils/format';
import type { BillingOverview, Paged, Invoice } from '../types';

export default function Billing() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const { data, loading, error } = useRequest<BillingOverview>(() => billingApi.overview(), []);
  const { data: invoices, loading: invLoading } = useRequest<Paged<Invoice>>(
    () => billingApi.invoices({ page, pageSize: 10, status }),
    [page, status]
  );

  if (error) return <Alert>{error}</Alert>;
  if (loading || !data) return <Loading />;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">计费中心</h1>
          <div className="page-desc">
            收入指标与账单流水。年付订阅的金额已按「月」折算，便于与月付套餐横向比较。
          </div>
        </div>
      </div>

      <div className="grid grid-stats" style={{ marginBottom: 14 }}>
        <StatCard label="MRR 月度经常性收入" value={formatMoney(data.mrr)} icon="收" hint={`年化 ${formatMoney(data.arr)}`} />
        <StatCard label="ARR 年度经常性收入" value={formatMoney(data.arr)} icon="年" tone="success" hint="MRR × 12" />
        <StatCard label="客单价 ARPU" value={formatMoney(data.arpu)} icon="价" tone="info" hint={`${data.counts.active} 个有效订阅`} />
        <StatCard label="流失率" value={`${data.churnRate}%`} icon="流" tone={data.churnRate > 10 ? 'danger' : 'warning'} hint={`${data.counts.canceled} 个已取消`} />
        <StatCard label="累计实收" value={formatMoney(data.collected.total)} icon="实" hint="近 6 个月账单" />
        <StatCard label="待收款" value={formatMoney(data.outstanding.total)} icon="待" tone="danger" hint={`${data.outstanding.count} 笔未结清`} />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <Card title="实收金额趋势（近 6 个月）">
          <BarChart data={data.collected.trend.map((t) => ({ label: t.label.slice(2), value: t.value }))} />
        </Card>
        <Card title="订阅构成">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { label: '有效订阅', value: data.counts.active, tone: 'success' as const },
              { label: '试用中', value: data.counts.trialing, tone: 'info' as const },
              { label: '逾期未付', value: data.counts.pastDue, tone: 'warning' as const },
              { label: '已取消', value: data.counts.canceled, tone: 'danger' as const },
            ].map((row) => (
              <div key={row.label} className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">{row.label}</span>
                <span className="row" style={{ gap: 8 }}>
                  <b>{formatNumber(row.value)}</b>
                  <Badge tone={row.tone}>{Math.round((row.value / Math.max(1, data.counts.subscriptions)) * 100)}%</Badge>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="账单流水"
        padded={false}
        extra={
          <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">全部状态</option>
            <option value="paid">已支付</option>
            <option value="open">待支付</option>
            <option value="free">免费</option>
          </select>
        }
      >
        {invLoading ? (
          <Loading />
        ) : !invoices || invoices.items.length === 0 ? (
          <Empty text="暂无账单" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>账单号</th>
                    <th>租户</th>
                    <th>账期</th>
                    <th>金额</th>
                    <th>状态</th>
                    <th>开具日期</th>
                    <th>支付日期</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.items.map((inv) => {
                    const meta = INVOICE_STATUS[inv.status] || { text: inv.status, tone: 'default' as const };
                    return (
                      <tr key={inv.id}>
                        <td data-label="账单号" className="mono">
                          {inv.number}
                        </td>
                        <td data-label="租户">{inv.tenantName}</td>
                        <td data-label="账期">{inv.periodLabel}</td>
                        <td data-label="金额">
                          <b>{formatMoney(inv.amount)}</b>
                        </td>
                        <td data-label="状态">
                          <Badge tone={meta.tone}>{meta.text}</Badge>
                        </td>
                        <td data-label="开具日期">{formatDate(inv.issuedAt)}</td>
                        <td data-label="支付日期">{formatDate(inv.paidAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager
              page={invoices.page}
              pageSize={invoices.pageSize}
              total={invoices.total}
              onChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
