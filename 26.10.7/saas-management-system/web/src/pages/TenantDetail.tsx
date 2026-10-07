import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { planApi, subscriptionApi, tenantApi } from '../api';
import { useRequest } from '../hooks/useRequest';
import { useAuthStore } from '../stores/authStore';
import { Alert, Badge, Card, Empty, Field, Loading, Modal, StatCard } from '../components/ui';
import { LineChart, ProgressBar } from '../components/charts';
import { formatDate, formatDateTime, formatMoney, fromNow, SUBSCRIPTION_STATUS, TENANT_STATUS } from '../utils/format';
import type { Plan, TenantDetail as TenantDetailType } from '../types';

export default function TenantDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const canUpdate = useAuthStore((s) => s.hasPermission('tenant:update'));
  const canManageSub = useAuthStore((s) => s.hasPermission('subscription:manage'));

  const [editing, setEditing] = useState(params.get('edit') === '1');
  const [changingPlan, setChangingPlan] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [planId, setPlanId] = useState('');
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, loading, error, reload } = useRequest<TenantDetailType>(() => tenantApi.detail(id), [id]);
  const { data: plans } = useRequest<Plan[]>(() => planApi.list(), []);

  if (loading) return <Loading />;
  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Empty text="租户不存在或无权访问" />;

  const st = TENANT_STATUS[data.status] || { text: data.status, tone: 'default' as const };
  const sub = data.subscription;
  const subStatus = sub ? SUBSCRIPTION_STATUS[sub.status] || { text: sub.status, tone: 'default' as const } : null;

  const startEdit = () => {
    setForm({
      name: data.name,
      industry: data.industry || '',
      contactName: data.contactName || '',
      contactEmail: data.contactEmail || '',
      contactPhone: data.contactPhone || '',
      remark: data.remark || '',
    });
    setErr(null);
    setEditing(true);
  };

  const submitEdit = async () => {
    setSaving(true);
    setErr(null);
    try {
      await tenantApi.update(data.id, form);
      setEditing(false);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitPlanChange = async () => {
    if (!planId) {
      setErr('请选择目标套餐');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await subscriptionApi.changePlan(data.id, planId, cycle);
      setChangingPlan(false);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">{data.name}</h1>
          <div className="page-desc">
            <span className="mono">{data.slug}</span> · {data.industry || '未填写行业'} · 开通于{' '}
            {formatDate(data.createdAt)}
          </div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => navigate('/tenants')}>
            返回列表
          </button>
          {canUpdate && (
            <button className="btn" onClick={startEdit}>
              编辑资料
            </button>
          )}
          {canManageSub && sub && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setPlanId(sub.planId);
                setCycle(sub.billingCycle);
                setErr(null);
                setChangingPlan(true);
              }}
            >
              变更套餐
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-stats" style={{ marginBottom: 14 }}>
        <StatCard label="租户状态" value={<Badge tone={st.tone}>{st.text}</Badge>} icon="态" />
        <StatCard label="当前套餐" value={data.planName} icon="套" hint={subStatus ? `订阅${subStatus.text}` : '无订阅'} />
        <StatCard
          label="席位使用"
          value={`${data.userCount} / ${data.seats}`}
          icon="席"
          tone={data.seats && data.userCount / data.seats > 0.8 ? 'danger' : 'success'}
          hint="超出后需先扩容"
        />
        <StatCard
          label="月度金额"
          value={formatMoney(sub ? (sub.billingCycle === 'yearly' ? Math.round(sub.unitAmount / 12) : sub.unitAmount) : 0)}
          icon="费"
          tone="warning"
          hint={sub ? (sub.billingCycle === 'yearly' ? '年付套餐' : '月付套餐') : '-'}
        />
        <StatCard label="下次计费日" value={formatDate(sub?.currentPeriodEnd)} icon="期" tone="info" />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 14 }}>
        <Card title="基础信息">
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 10, columnGap: 16, fontSize: 13.5 }}>
            <span className="muted">租户 ID</span>
            <span className="mono">{data.id}</span>
            <span className="muted">联系人</span>
            <span>{data.contactName || '-'}</span>
            <span className="muted">联系邮箱</span>
            <span>{data.contactEmail || '-'}</span>
            <span className="muted">联系电话</span>
            <span>{data.contactPhone || '-'}</span>
            <span className="muted">备注</span>
            <span>{data.remark || '-'}</span>
          </div>
          {sub && (
            <div style={{ marginTop: 16 }}>
              <ProgressBar
                value={data.seats ? (data.userCount / data.seats) * 100 : 0}
                label={`席位使用率 ${data.userCount} / ${data.seats}`}
              />
              <div className="small muted" style={{ marginTop: 8 }}>
                自动续费：{sub.autoRenew ? '已开启' : '已关闭'}
                {sub.trialEndsAt ? ` · 试用截止 ${formatDate(sub.trialEndsAt)}` : ''}
              </div>
            </div>
          )}
        </Card>

        <Card title="API 调用趋势（近 30 天）">
          <LineChart
            data={data.usage.slice(-14).map((u) => ({ label: u.date.slice(5), value: u.apiCalls }))}
            color="#16a34a"
          />
        </Card>
      </div>

      <Card title={`租户账号（${data.users.length}）`} padded={false}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>状态</th>
                <th>最近登录</th>
              </tr>
            </thead>
            <tbody>
              {data.users.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <Empty text="该租户还没有账号" />
                  </td>
                </tr>
              )}
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td data-label="姓名">{u.displayName}</td>
                  <td data-label="邮箱">{u.email}</td>
                  <td data-label="角色">{u.roles.join('、') || '-'}</td>
                  <td data-label="状态">
                    <Badge tone={u.status === 'active' ? 'success' : 'default'}>
                      {u.status === 'active' ? '启用' : '停用'}
                    </Badge>
                  </td>
                  <td data-label="最近登录" className="small muted">
                    {fromNow(u.lastLoginAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="small muted" style={{ marginTop: 12 }}>
        最近更新：{formatDateTime(data.updatedAt)}
      </div>

      {editing && (
        <Modal
          title="编辑租户资料"
          onClose={() => setEditing(false)}
          footer={
            <>
              <button className="btn" onClick={() => setEditing(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={submitEdit} disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </button>
            </>
          }
        >
          {err && <Alert>{err}</Alert>}
          <Field label="租户名称">
            <input className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="所属行业">
            <input className="input" value={form.industry ?? ''} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="联系人">
              <input className="input" value={form.contactName ?? ''} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </Field>
            <Field label="联系邮箱">
              <input className="input" value={form.contactEmail ?? ''} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </Field>
          </div>
          <Field label="联系电话">
            <input className="input" value={form.contactPhone ?? ''} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
          </Field>
          <Field label="备注">
            <textarea className="input" rows={3} value={form.remark ?? ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
          </Field>
        </Modal>
      )}

      {changingPlan && (
        <Modal
          title="变更订阅套餐"
          onClose={() => setChangingPlan(false)}
          footer={
            <>
              <button className="btn" onClick={() => setChangingPlan(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={submitPlanChange} disabled={saving}>
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
            变更立即生效。若目标套餐席位小于当前已有账号数，系统会拒绝变更并提示先清理账号。
          </p>
        </Modal>
      )}
    </div>
  );
}
