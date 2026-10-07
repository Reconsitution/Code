import { dashboardApi } from '../api';
import { useRequest } from '../hooks/useRequest';
import { useAuthStore } from '../stores/authStore';
import { Alert, Badge, Card, Empty, Loading, StatCard } from '../components/ui';
import { BarChart, DonutChart, LineChart, ProgressBar } from '../components/charts';
import { formatDate, formatDateTime, formatMoney, formatNumber, INVOICE_STATUS } from '../utils/format';
import type { PlatformDashboard, TenantDashboard } from '../types';

export default function Dashboard() {
  const isPlatform = useAuthStore((s) => s.user?.isPlatform ?? false);
  const displayName = useAuthStore((s) => s.user?.displayName ?? '');

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{isPlatform ? '平台数据概览' : '租户数据概览'}</h1>
          <div className="page-desc">
            欢迎回来，{displayName}。{isPlatform ? '当前展示全平台汇总数据。' : '当前仅展示你所属租户的数据。'}
          </div>
        </div>
      </div>
      {isPlatform ? <PlatformView /> : <TenantView />}
    </div>
  );
}

/* ============================================================== 平台视角 */
function PlatformView() {
  const { data, loading, error } = useRequest<PlatformDashboard>(() => dashboardApi.platform());

  if (loading) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Empty />;

  const { stats } = data;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="grid grid-stats">
        <StatCard label="租户总数" value={stats.tenantTotal} icon="多" hint={`本月新增 ${stats.newTenantThisMonth} 个`} />
        <StatCard
          label="正常运营租户"
          value={stats.tenantActive}
          icon="运"
          tone="success"
          hint={`已停用 ${stats.tenantSuspended} 个`}
        />
        <StatCard label="租户账号总数" value={formatNumber(stats.userTotal)} icon="账" tone="info" hint="不含平台侧账号" />
        <StatCard label="月度经常性收入 MRR" value={formatMoney(stats.mrr)} icon="收" hint={`年化 ${formatMoney(stats.arr)}`} />
        <StatCard label="客单价 ARPU" value={formatMoney(stats.arpu)} icon="价" tone="warning" hint="MRR / 有效订阅数" />
        <StatCard label="待收款金额" value={formatMoney(stats.outstanding)} icon="待" tone="danger" hint="未结清账单合计" />
      </div>

      <div className="grid grid-2">
        <Card title="租户增长趋势（近 12 个月）">
          <LineChart data={data.growth} />
        </Card>
        <Card title="套餐分布">
          <DonutChart data={data.planDistribution} unit="个租户" />
        </Card>
      </div>

      <div className="grid grid-2">
        <Card title="实收金额（近 6 个月）">
          <BarChart data={data.revenueTrend.map((r) => ({ label: r.label.slice(2), value: r.value }))} />
        </Card>
        <Card title="订阅状态分布">
          <DonutChart
            data={data.statusDistribution.map((s) => ({
              name:
                { active: '有效', trialing: '试用中', past_due: '逾期', canceled: '已取消' }[s.name] || s.name,
              value: s.value,
            }))}
            unit="个订阅"
          />
        </Card>
      </div>

      <Card title="MRR 贡献 Top 租户" padded={false}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>租户</th>
                <th>套餐</th>
                <th>状态</th>
                <th>席位使用</th>
                <th style={{ textAlign: 'right' }}>MRR</th>
              </tr>
            </thead>
            <tbody>
              {data.topTenants.map((t) => (
                <tr key={t.id}>
                  <td data-label="租户">
                    <b>{t.name}</b>
                    <div className="small muted mono">{t.slug}</div>
                  </td>
                  <td data-label="套餐">{t.planName}</td>
                  <td data-label="状态">
                    <Badge tone={t.status === 'active' ? 'success' : t.status === 'past_due' ? 'warning' : 'danger'}>
                      {{ active: '有效', trialing: '试用中', past_due: '逾期', canceled: '已取消' }[t.status] || t.status}
                    </Badge>
                  </td>
                  <td data-label="席位使用" style={{ minWidth: 130 }}>
                    <ProgressBar value={t.seats ? (t.used / t.seats) * 100 : 0} label={`${t.used} / ${t.seats}`} />
                  </td>
                  <td data-label="MRR" style={{ textAlign: 'right' }}>
                    <b>{formatMoney(t.mrr)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="最近操作日志" padded={false}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>操作人</th>
                <th>动作</th>
                <th>对象</th>
                <th>租户</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {data.recentLogs.map((l) => (
                <tr key={l.id}>
                  <td data-label="操作人">{l.actorName}</td>
                  <td data-label="动作">
                    <Badge tone="default">{l.actionLabel}</Badge>
                  </td>
                  <td data-label="对象">{l.target}</td>
                  <td data-label="租户">{l.tenantName || '-'}</td>
                  <td data-label="时间" className="small muted">
                    {formatDateTime(l.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================== 租户视角 */
function TenantView() {
  const { data, loading, error } = useRequest<TenantDashboard>(() => dashboardApi.tenant());

  if (loading) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Empty />;

  const { stats, tenant } = data;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="grid grid-stats">
        <StatCard label="当前套餐" value={stats.planName} icon="套" hint={`订阅状态：${stats.subscriptionStatus || '-'}`} />
        <StatCard label="账号数 / 席位" value={`${stats.userTotal} / ${stats.seats}`} icon="席" hint={`启用 ${stats.activeUsers} · 停用 ${stats.disabledUsers}`} />
        <StatCard label="席位使用率" value={`${stats.seatUsage}%`} icon="率" tone={stats.seatUsage >= 80 ? 'danger' : 'success'} hint="接近上限时请联系平台升级" />
        <StatCard label="本月订阅金额" value={formatMoney(stats.mrr)} icon="费" tone="warning" hint={`上次支付 ${formatMoney(stats.lastPaidAmount)}`} />
        <StatCard label="下次计费日" value={formatDate(stats.currentPeriodEnd)} icon="期" tone="info" hint={`开通于 ${formatDate(tenant.createdAt)}`} />
      </div>

      <div className="grid grid-2">
        <Card title="API 调用量（近 14 天）">
          <LineChart data={data.usage.map((u) => ({ label: u.label, value: u.apiCalls }))} color="#16a34a" />
        </Card>
        <Card title="账号角色分布">
          <DonutChart data={data.roleDistribution} unit="个账号" />
        </Card>
      </div>

      <Card title="最近账单" padded={false}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>账单号</th>
                <th>账期</th>
                <th>金额</th>
                <th>状态</th>
                <th>支付时间</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <Empty text="暂无账单记录" />
                  </td>
                </tr>
              )}
              {data.invoices.map((inv) => {
                const meta = INVOICE_STATUS[inv.status] || { text: inv.status, tone: 'default' as const };
                return (
                  <tr key={inv.id}>
                    <td data-label="账单号" className="mono">
                      {inv.number}
                    </td>
                    <td data-label="账期">{inv.periodLabel}</td>
                    <td data-label="金额">
                      <b>{formatMoney(inv.amount)}</b>
                    </td>
                    <td data-label="状态">
                      <Badge tone={meta.tone}>{meta.text}</Badge>
                    </td>
                    <td data-label="支付时间" className="small muted">
                      {formatDate(inv.paidAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="本租户最近操作" padded={false}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>操作人</th>
                <th>动作</th>
                <th>对象</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {data.recentLogs.map((l) => (
                <tr key={l.id}>
                  <td data-label="操作人">{l.actorName}</td>
                  <td data-label="动作">
                    <Badge tone="default">{l.actionLabel}</Badge>
                  </td>
                  <td data-label="对象">{l.target}</td>
                  <td data-label="时间" className="small muted">
                    {formatDateTime(l.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
