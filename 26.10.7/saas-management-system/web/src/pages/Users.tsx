import { useMemo, useState } from 'react';
import { roleApi, tenantApi, userApi } from '../api';
import { useRequest } from '../hooks/useRequest';
import { useAuthStore } from '../stores/authStore';
import { Alert, Badge, Card, Empty, Field, Loading, Modal, Pager } from '../components/ui';
import { formatDate, fromNow } from '../utils/format';
import type { Paged, Role, Tenant, UserItem } from '../types';

interface FormState {
  username: string;
  email: string;
  displayName: string;
  phone: string;
  password: string;
  roleIds: string[];
  tenantId: string;
  status: string;
}

const EMPTY: FormState = {
  username: '',
  email: '',
  displayName: '',
  phone: '',
  password: '',
  roleIds: [],
  tenantId: '',
  status: 'active',
};

export default function Users() {
  const isPlatform = useAuthStore((s) => s.user?.isPlatform ?? false);
  const myTenantId = useAuthStore((s) => s.user?.tenantId ?? null);
  const canCreate = useAuthStore((s) => s.hasPermission('user:create'));
  const canUpdate = useAuthStore((s) => s.hasPermission('user:update'));
  const canDelete = useAuthStore((s) => s.hasPermission('user:delete'));
  const canReset = useAuthStore((s) => s.hasPermission('user:reset-password'));

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');

  const [editing, setEditing] = useState<UserItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, loading, error, reload } = useRequest<Paged<UserItem>>(
    () => userApi.list({ page, pageSize: 10, keyword, status, roleId: roleFilter, tenantId: tenantFilter }),
    [page, keyword, status, roleFilter, tenantFilter]
  );

  const { data: tenants } = useRequest<Paged<Tenant>>(() => tenantApi.list({ pageSize: 100 }), []);
  const { data: roles } = useRequest<Role[]>(() => roleApi.list({ tenantId: tenantFilter || undefined }), [tenantFilter]);

  const roleOptions = useMemo(() => roles ?? [], [roles]);

  const { data: createRoles } = useRequest<Role[]>(
    () => roleApi.list({ tenantId: form.tenantId || undefined }),
    [form.tenantId]
  );
  const createRoleOptions = useMemo(() => createRoles ?? [], [createRoles]);

  const openCreate = () => {
    setForm({ ...EMPTY, tenantId: isPlatform ? '' : (myTenantId ?? '') });
    setErr(null);
    setCreating(true);
  };

  const openEdit = (u: UserItem) => {
    setForm({
      username: u.username,
      email: u.email,
      displayName: u.displayName,
      phone: u.phone,
      password: '',
      roleIds: u.roles.map((r) => r.id),
      tenantId: u.tenantId ?? '',
      status: u.status,
    });
    setErr(null);
    setEditing(u);
  };

  const submitCreate = async () => {
    setErr(null);
    if (!form.username.trim() || !form.email.trim()) {
      setErr('用户名与邮箱不能为空');
      return;
    }
    if (!form.roleIds.length) {
      setErr('请至少选择一个角色');
      return;
    }
    setSaving(true);
    try {
      await userApi.create({
        username: form.username,
        email: form.email,
        displayName: form.displayName,
        phone: form.phone,
        password: form.password || undefined,
        roleIds: form.roleIds,
        tenantId: isPlatform ? form.tenantId || null : myTenantId,
      });
      setCreating(false);
      setPage(1);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!editing) return;
    setErr(null);
    setSaving(true);
    try {
      await userApi.update(editing.id, {
        displayName: form.displayName,
        phone: form.phone,
        status: form.status,
        roleIds: form.roleIds,
      });
      setEditing(null);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (u: UserItem) => {
    if (!window.confirm(`确定删除账号「${u.displayName}」吗？该操作不可恢复。`)) return;
    try {
      await userApi.remove(u.id);
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const doReset = async (u: UserItem) => {
    try {
      const res = await userApi.resetPassword(u.id);
      alert(`密码已重置为：${res.tempPassword}`);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">账号管理</h1>
          <div className="page-desc">
            {isPlatform
              ? '平台侧可管理所有租户账号；切换租户筛选后新建账号会归属到该租户。'
              : '仅显示你所属租户内的账号，无法查看或修改其他租户的数据。'}
          </div>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={openCreate}>
            新建账号
          </button>
        )}
      </div>

      <Card padded>
        <div className="row">
          <input
            className="input"
            style={{ width: 200 }}
            placeholder="搜索姓名 / 邮箱 / 用户名"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
          <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">全部状态</option>
            <option value="active">启用</option>
            <option value="disabled">停用</option>
          </select>
          <select className="select" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">全部角色</option>
            {roleOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {isPlatform && (
            <select className="select" value={tenantFilter} onChange={(e) => { setTenantFilter(e.target.value); setPage(1); }}>
              <option value="">全部租户</option>
              {(tenants?.items ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <span className="spacer" />
          <span className="small muted">共 {data?.total ?? 0} 个账号</span>
        </div>
      </Card>

      <div style={{ marginTop: 14 }}>
        {error && <Alert>{error}</Alert>}
        <Card padded={false}>
          {loading ? (
            <Loading />
          ) : !data || data.items.length === 0 ? (
            <Empty text="没有符合条件的账号" />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>姓名</th>
                      <th>账号 / 邮箱</th>
                      <th>所属</th>
                      <th>角色</th>
                      <th>状态</th>
                      <th>最近登录</th>
                      <th>创建时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((u) => (
                      <tr key={u.id}>
                        <td data-label="姓名">
                          <b>{u.displayName}</b>
                        </td>
                        <td data-label="账号 / 邮箱">
                          <span className="mono">{u.username}</span>
                          <div className="small muted">{u.email}</div>
                        </td>
                        <td data-label="所属">
                          {u.isPlatform ? <Badge tone="primary">平台侧</Badge> : u.tenantName}
                        </td>
                        <td data-label="角色">
                          <div className="row" style={{ gap: 4 }}>
                            {u.roles.map((r) => (
                              <Badge key={r.id} tone="info">
                                {r.name}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td data-label="状态">
                          <Badge tone={u.status === 'active' ? 'success' : 'default'}>
                            {u.status === 'active' ? '启用' : '停用'}
                          </Badge>
                        </td>
                        <td data-label="最近登录" className="small muted">
                          {fromNow(u.lastLoginAt)}
                        </td>
                        <td data-label="创建时间" className="small muted">
                          {formatDate(u.createdAt)}
                        </td>
                        <td data-label="操作">
                          <div className="row" style={{ gap: 4 }}>
                            {canUpdate && (
                              <button className="btn btn-sm" onClick={() => openEdit(u)}>
                                编辑
                              </button>
                            )}
                            {canReset && (
                              <button className="btn btn-sm" onClick={() => doReset(u)}>
                                重置密码
                              </button>
                            )}
                            {canDelete && (
                              <button className="btn btn-sm btn-danger" onClick={() => doDelete(u)}>
                                删除
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
            </>
          )}
        </Card>
      </div>

      {(creating || editing) && (
        <Modal
          title={editing ? `编辑账号 · ${editing.displayName}` : '新建账号'}
          maxWidth={560}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          footer={
            <>
              <button
                className="btn"
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                }}
              >
                取消
              </button>
              <button className="btn btn-primary" onClick={editing ? submitEdit : submitCreate} disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </button>
            </>
          }
        >
          {err && <Alert>{err}</Alert>}

          {!editing && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="用户名">
                  <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </Field>
                <Field label="邮箱">
                  <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
              </div>
              <Field label="初始密码">
                <input
                  className="input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="留空则使用系统默认初始密码"
                />
              </Field>
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="姓名">
              <input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </Field>
            <Field label="手机号">
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>

          {isPlatform && !editing && (
            <Field label="归属租户">
              <select className="select" value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value, roleIds: [] })}>
                <option value="">平台侧账号（不属于任何租户）</option>
                {(tenants?.items ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="角色">
            <div className="perm-list">
              {(editing ? roleOptions : createRoleOptions).map((r) => (
                <label className="perm-check" key={r.id}>
                  <input
                    type="checkbox"
                    checked={form.roleIds.includes(r.id)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        roleIds: e.target.checked
                          ? [...form.roleIds, r.id]
                          : form.roleIds.filter((x) => x !== r.id),
                      })
                    }
                  />
                  {r.name}
                </label>
              ))}
            </div>
            <span className="small muted">只能分配你自己拥有的权限范围内的角色。</span>
          </Field>

          {editing && (
            <Field label="状态">
              <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">启用</option>
                <option value="disabled">停用</option>
              </select>
            </Field>
          )}
        </Modal>
      )}
    </div>
  );
}
