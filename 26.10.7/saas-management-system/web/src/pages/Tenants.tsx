import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { planApi, tenantApi } from '../api';
import { useRequest } from '../hooks/useRequest';
import { useAuthStore } from '../stores/authStore';
import { Alert, Badge, Card, Empty, Field, Loading, Modal, Pager } from '../components/ui';
import { ProgressBar } from '../components/charts';
import { formatDate, formatNumber, SUBSCRIPTION_STATUS, TENANT_STATUS } from '../utils/format';
import type { Paged, Plan, Tenant } from '../types';

const EMPTY_FORM = {
  name: '',
  slug: '',
  industry: '',
  planId: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
};

export default function Tenants() {
  const navigate = useNavigate();
  const canCreate = useAuthStore((s) => s.hasPermission('tenant:create'));
  const canUpdate = useAuthStore((s) => s.hasPermission('tenant:update'));
  const canSuspend = useAuthStore((s) => s.hasPermission('tenant:suspend'));

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, loading, error, reload } = useRequest<Paged<Tenant>>(
    () => tenantApi.list({ page, pageSize: 10, keyword, status, planId: planFilter }),
    [page, keyword, status, planFilter]
  );
  const { data: plans } = useRequest<Plan[]>(() => planApi.list(), []);

  const submitCreate = async () => {
    setFormError(null);
    if (!form.name.trim() || !form.slug.trim()) {
      setFormError('租户名称与标识不能为空');
      return;
    }
    setSaving(true);
    try {
      await tenantApi.create({ ...form, planId: form.planId || (plans?.[0]?.id ?? '') });
      setCreating(false);
      setForm({ ...EMPTY_FORM });
      setPage(1);
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (tenant: Tenant) => {
    const next = tenant.status === 'active' ? 'suspended' : 'active';
    try {
      await tenantApi.setStatus(tenant.id, next);
      reload();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">租户管理</h1>
          <div className="page-desc">平台侧视图：管理所有入驻租户的资料、套餐与启停状态。</div>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            新建租户
          </button>
        )}
      </div>

      <Card padded>
        <div className="row">
          <input
            className="input"
            style={{ width: 220 }}
            placeholder="搜索名称 / 标识 / 邮箱"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
          <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">全部状态</option>
            <option value="active">正常</option>
            <option value="suspended">已停用</option>
          </select>
          <select className="select" value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}>
            <option value="">全部套餐</option>
            {(plans ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="spacer" />
          <span className="small muted">共 {data?.total ?? 0} 个租户</span>
        </div>
      </Card>

      <div style={{ marginTop: 14 }}>
        {error && <Alert>{error}</Alert>}
        <Card padded={false}>
          {loading ? (
            <Loading />
          ) : !data || data.items.length === 0 ? (
            <Empty text="没有符合条件的租户" />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>租户</th>
                      <th>行业</th>
                      <th>套餐</th>
                      <th>订阅状态</th>
                      <th>席位使用</th>
                      <th>账号数</th>
                      <th>联系人</th>
                      <th>创建时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((t) => {
                      const st = TENANT_STATUS[t.status] || { text: t.status, tone: 'default' as const };
                      const sub = t.subscriptionStatus
                        ? SUBSCRIPTION_STATUS[t.subscriptionStatus] || { text: t.subscriptionStatus, tone: 'default' as const }
                        : null;
                      return (
                        <tr key={t.id}>
                          <td data-label="租户">
                            <b>{t.name}</b>
                            <div className="small muted mono">{t.slug}</div>
                          </td>
                          <td data-label="行业">{t.industry || '-'}</td>
                          <td data-label="套餐">{t.planName}</td>
                          <td data-label="订阅状态">
                            <div className="row" style={{ gap: 6 }}>
                              <Badge tone={st.tone}>{st.text}</Badge>
                              {sub && <Badge tone={sub.tone}>{sub.text}</Badge>}
                            </div>
                          </td>
                          <td data-label="席位使用" style={{ minWidth: 130 }}>
                            <ProgressBar value={t.seats ? (t.userCount / t.seats) * 100 : 0} label={`${t.userCount} / ${t.seats}`} />
                          </td>
                          <td data-label="账号数">{formatNumber(t.userCount)}</td>
                          <td data-label="联系人">
                            {t.contactName || '-'}
                            <div className="small muted">{t.contactEmail}</div>
                          </td>
                          <td data-label="创建时间" className="small muted">
                            {formatDate(t.createdAt)}
                          </td>
                          <td data-label="操作">
                            <div className="row" style={{ gap: 4 }}>
                              <button className="btn btn-sm" onClick={() => navigate(`/tenants/${t.id}`)}>
                                详情
                              </button>
                              {canUpdate && (
                                <button className="btn btn-sm" onClick={() => navigate(`/tenants/${t.id}?edit=1`)}>
                                  编辑
                                </button>
                              )}
                              {canSuspend && (
                                <button
                                  className={`btn btn-sm ${t.status === 'active' ? '' : 'btn-primary'}`}
                                  onClick={() => toggleStatus(t)}
                                >
                                  {t.status === 'active' ? '停用' : '启用'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pager page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
            </>
          )}
        </Card>
      </div>

      {creating && (
        <Modal
          title="新建租户"
          onClose={() => setCreating(false)}
          footer={
            <>
              <button className="btn" onClick={() => setCreating(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={submitCreate} disabled={saving}>
                {saving ? '创建中…' : '创建'}
              </button>
            </>
          }
        >
          {formError && <Alert>{formError}</Alert>}
          <Field label="租户名称">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例如：Acme 科技" />
          </Field>
          <Field label="租户标识（英文小写，用于登录域）">
            <input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="acme" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="所属行业">
              <input className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </Field>
            <Field label="初始套餐">
              <select className="select" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
                <option value="">默认（免费试用版）</option>
                {(plans ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.seats} 席位
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="联系人">
              <input className="input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </Field>
            <Field label="联系邮箱">
              <input className="input" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </Field>
          </div>
          <Field label="联系电话">
            <input className="input" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
          </Field>
          <p className="small muted" style={{ margin: 0 }}>
            创建后会自动为该租户生成「租户管理员」「租户普通成员」两个内置角色，并开通一条订阅记录。
          </p>
        </Modal>
      )}
    </div>
  );
}
