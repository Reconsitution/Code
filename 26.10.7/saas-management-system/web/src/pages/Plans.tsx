import { useState } from 'react';
import { planApi, subscriptionApi, tenantApi } from '../api';
import { useRequest } from '../hooks/useRequest';
import { useAuthStore } from '../stores/authStore';
import { Alert, Badge, Card, Empty, Field, Loading, Modal, StatCard, Tabs } from '../components/ui';
import { formatDate, formatMoney, SUBSCRIPTION_STATUS } from '../utils/format';
import type { Plan, Subscription, Tenant } from '../types';
import type { Paged } from '../types';

const EMPTY_PLAN = { name: '', code: '', priceMonthly: 0, priceYearly: 0, seats: 10, features: [] as string[] };

export default function Plans() {
  const isPlatform = useAuthStore((s) => s.user?.isPlatform ?? false);
  const canManagePlan = useAuthStore((s) => s.hasPermission('plan:manage'));
  const canManageSub = useAuthStore((s) => s.hasPermission('subscription:manage'));
  const [tab, setTab] = useState<'plans' | 'subscriptions'>('plans');

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">套餐订阅</h1>
          <div className="page-desc">
            {isPlatform ? '配置可售套餐，并查看、变更各租户的订阅状态。' : '查看可选套餐与本租户当前订阅情况。'}
          </div>
        </div>
      </div>

      <Tabs
        items={[
          { value: 'plans', label: '套餐列表' },
          { value: 'subscriptions', label: '订阅记录' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'plans' ? (
        <PlanList canManage={canManagePlan} />
      ) : (
        <SubscriptionList canManage={canManageSub} isPlatform={isPlatform} />
      )}
    </div>
  );
}

/* ============================================================ 套餐 */
function PlanList({ canManage }: { canManage: boolean }) {
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_PLAN });
  const [featureText, setFeatureText] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, loading, error, reload } = useRequest<Plan[]>(() => planApi.list(), []);

  const openCreate = () => {
    setForm({ ...EMPTY_PLAN });
    setFeatureText('');
    setErr(null);
    setCreating(true);
  };

  const openEdit = (p: Plan) => {
    setForm({
      name: p.name,
      code: p.code,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      seats: p.seats,
      features: p.features.slice(),
    });
    setFeatureText(p.features.join('\n'));
    setErr(null);
    setEditing(p);
  };

  const submit = async () => {
    setErr(null);
    if (!form.name.trim() || !form.code.trim()) {
      setErr('套餐名称与编码不能为空');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        features: featureText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (editing) await planApi.update(editing.id, payload);
      else await planApi.create(payload);
      setEditing(null);
      setCreating(false);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  if (!data?.length) return <Empty text="暂无套餐" />;

  return (
    <>
      <div className="page-head" style={{ marginBottom: 12 }}>
        <span className="small muted">共 {data.length} 个套餐</span>
        {canManage && (
          <button className="btn btn-primary" onClick={openCreate}>
            新建套餐
          </button>
        )}
      </div>

      <div className="grid grid-stats">
        {data.map((p) => (
          <Card key={p.id} extra={canManage ? <button className="btn btn-sm" onClick={() => openEdit(p)}>编辑</button> : null}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <b style={{ fontSize: 15 }}>{p.name}</b>
              <Badge tone="default">{p.seats} 席位</Badge>
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 2 }}>
              {formatMoney(p.priceMonthly)}
              <span className="small muted" style={{ fontWeight: 400 }}> / 月</span>
            </div>
            <div className="small muted" style={{ marginBottom: 12 }}>
              年付 {formatMoney(p.priceYearly)} · {p.tenantCount} 个租户在用
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--text-2)' }}>
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {(creating || editing) && (
        <Modal
          title={editing ? `编辑套餐 · ${editing.name}` : '新建套餐'}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          footer={
            <>
              <button className="btn" onClick={() => { setCreating(false); setEditing(null); }}>
                取消
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </button>
            </>
          }
        >
          {err && <Alert>{err}</Alert>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="套餐名称">
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="套餐编码">
              <input className="input" value={form.code} disabled={Boolean(editing)} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="月价（元）">
              <input className="input" type="number" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: Number(e.target.value) })} />
            </Field>
            <Field label="年价（元）">
              <input className="input" type="number" value={form.priceYearly} onChange={(e) => setForm({ ...form, priceYearly: Number(e.target.value) })} />
            </Field>
            <Field label="席位数">
              <input className="input" type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="权益说明（每行一条）">
            <textarea className="input" rows={5} value={featureText} onChange={(e) => setFeatureText(e.target.value)} />
          </Field>
        </Modal>
      )}
    </>
  );
}

/* ============================================================ 订阅 */
function SubscriptionList({ canManage, isPlatform }: { canManage: boolean; isPlatform: boolean }) {
  const [changing, setChanging] = useState<Subscription | null>(null);
  const [planId, setPlanId] = useState('');
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, loading, error, reload } = useRequest<Subscription[]>(() => subscriptionApi.list(), []);
  const { data: plans } = useRequest<Plan[]>(() => planApi.list(), []);
  const { data: tenants } = useRequest<Paged<Tenant>>(() => tenantApi.list({ pageSize: 100 }), []);

  const openChange = (s: Subscription) => {
    setPlanId(s.planId);
    setCycle(s.billingCycle);
    setErr(null);
    setChanging(s);
  };

  const submitChange = async () => {
    if (!changing) return;
    setSaving(true);
    setErr(null);
    try {
      await subscriptionApi.changePlan(changing.tenantId, planId, cycle);
      setChanging(null);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleRenew = async (s: Subscription) => {
    try {
      await subscriptionApi.toggleAutoRenew(s.id);
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const cancelSub = async (s: Subscription) => {
    if (!window.confirm(`确定取消「${s.tenantName}」的订阅吗？`)) return;
    try {
      await subscriptionApi.cancel(s.id);
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  if (loading) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  if (!data?.length) return <Empty text="暂无订阅记录" />;

  const mrrTotal = data.filter((s) => s.status === 'active' || s.status === 'trialing').reduce((a, b) => a + b.mrr, 0);

  return (
    <>
      <div className="grid grid-stats" style={{ marginBottom: 14 }}>
        <StatCard label="订阅总数" value={data.length} icon="订" />
        <StatCard label="有效订阅" value={data.filter((s) => s.status === 'active').length} icon="效" tone="success" />
        <StatCard label="试用中" value={data.filter((s) => s.status === 'trialing').length} icon="试" tone="info" />
        <StatCard label="逾期 / 已取消" value={data.filter((s) => s.status === 'past_due' || s.status === 'canceled').length} icon="警" tone="danger" />
        <StatCard label="折算 MRR" value={formatMoney(mrrTotal)} icon="收" tone="warning" />
      </div>

      <Card padded={false}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>租户</th>
                <th>套餐</th>
                <th>状态</th>
                <th>周期</th>
                <th>本期结束</th>
                <th>席位</th>
                <th style={{ textAlign: 'right' }}>金额</th>
                <th>自动续费</th>
                {canManage && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((s) => {
                const meta = SUBSCRIPTION_STATUS[s.status] || { text: s.status, tone: 'default' as const };
                return (
                  <tr key={s.id}>
                    <td data-label="租户">
                      <b>{s.tenantName}</b>
                      <div className="small muted mono">{s.tenantSlug}</div>
                    </td>
                    <td data-label="套餐">{s.planName}</td>
                    <td data-label="状态">
                      <Badge tone={meta.tone}>{meta.text}</Badge>
                    </td>
                    <td data-label="周期">{s.billingCycle === 'yearly' ? '年付' : '月付'}</td>
                    <td data-label="本期结束">{formatDate(s.currentPeriodEnd)}</td>
                    <td data-label="席位">{s.seats}</td>
                    <td data-label="金额" style={{ textAlign: 'right' }}>
                      <b>{formatMoney(s.unitAmount)}</b>
                      <div className="small muted">MRR {formatMoney(s.mrr)}</div>
                    </td>
                    <td data-label="自动续费">
                      <Badge tone={s.autoRenew ? 'success' : 'default'}>{s.autoRenew ? '开启' : '关闭'}</Badge>
                    </td>
                    {canManage && (
                      <td data-label="操作">
                        <div className="row" style={{ gap: 4 }}>
                          <button className="btn btn-sm" onClick={() => openChange(s)}>
                            变更
                          </button>
                          <button className="btn btn-sm" onClick={() => toggleRenew(s)}>
                            {s.autoRenew ? '关闭续费' : '开启续费'}
                          </button>
                          {s.status !== 'canceled' && (
                            <button className="btn btn-sm btn-danger" onClick={() => cancelSub(s)}>
                              取消
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {!isPlatform && (
        <div className="small muted" style={{ marginTop: 10 }}>
          变更套餐与取消订阅属于平台侧操作，如有需要请联系平台管理员。
        </div>
      )}

      {changing && (
        <Modal
          title={`变更订阅 · ${changing.tenantName}`}
          onClose={() => setChanging(null)}
          footer={
            <>
              <button className="btn" onClick={() => setChanging(null)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={submitChange} disabled={saving}>
                {saving ? '提交中…' : '确认变更'}
              </button>
            </>
          }
        >
          {err && <Alert>{err}</Alert>}
          <Field label="目标套餐">
            <select className="select" value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {(plans ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.seats} 席位 · {formatMoney(p.priceMonthly)}/月
                </option>
              ))}
            </select>
          </Field>
          <Field label="计费周期">
            <select className="select" value={cycle} onChange={(e) => setCycle(e.target.value as 'monthly' | 'yearly')}>
              <option value="monthly">按月付费</option>
              <option value="yearly">按年付费（省 2 个月）</option>
            </select>
          </Field>
          <p className="small muted" style={{ margin: 0 }}>
            当前租户规模：{(tenants?.items ?? []).find((t) => t.id === changing.tenantId)?.userCount ?? '-'} 个账号，目标套餐席位不足时会被拒绝。
          </p>
        </Modal>
      )}
    </>
  );
}
