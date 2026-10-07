import { useMemo, useState } from 'react';
import { roleApi } from '../api';
import { useRequest } from '../hooks/useRequest';
import { useAuthStore } from '../stores/authStore';
import { Alert, Badge, Card, Empty, Field, Loading, Modal } from '../components/ui';
import { formatDate } from '../utils/format';
import type { PermissionItem, Role } from '../types';

export default function Roles() {
  const myPermissions = useAuthStore((s) => s.user?.permissions ?? []);
  const canManage = useAuthStore((s) => s.hasPermission('role:manage'));
  const isPlatform = useAuthStore((s) => s.user?.isPlatform ?? false);

  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ name: string; code: string; description: string; permissions: string[] }>({
    name: '',
    code: '',
    description: '',
    permissions: [],
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, loading, error, reload } = useRequest<Role[]>(() => roleApi.list(), []);
  const { data: permData } = useRequest<{ permissions: PermissionItem[] }>(() => roleApi.permissions(), []);

  const groups = useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    for (const p of permData?.permissions ?? []) {
      const list = map.get(p.module) ?? [];
      list.push(p);
      map.set(p.module, list);
    }
    return Array.from(map.entries()).map(([module, items]) => ({ module, items }));
  }, [permData]);

  const openCreate = () => {
    setForm({ name: '', code: '', description: '', permissions: [] });
    setErr(null);
    setCreating(true);
  };

  const openEdit = (r: Role) => {
    setForm({ name: r.name, code: r.code, description: r.description, permissions: r.permissions.slice() });
    setErr(null);
    setEditing(r);
  };

  const submit = async () => {
    setErr(null);
    if (!form.name.trim() || (!editing && !form.code.trim())) {
      setErr('角色名称与编码不能为空');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await roleApi.update(editing.id, {
          name: form.name,
          description: form.description,
          permissions: form.permissions,
        });
      } else {
        await roleApi.create({
          name: form.name,
          code: form.code,
          description: form.description,
          permissions: form.permissions,
        });
      }
      setEditing(null);
      setCreating(false);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const removeRole = async (r: Role) => {
    if (!window.confirm(`确定删除角色「${r.name}」吗？`)) return;
    try {
      await roleApi.remove(r.id);
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">角色权限</h1>
          <div className="page-desc">
            角色是一组权限码的集合，决定菜单可见性与操作按钮。勾选框中灰掉的项表示你自己不具备、因此无权授予。
          </div>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={openCreate}>
            新建角色
          </button>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <Card>
          <Empty text="暂无角色" />
        </Card>
      ) : (
        <div className="grid grid-2">
          {data.map((r) => (
            <Card
              key={r.id}
              title={
                <div className="row" style={{ gap: 8 }}>
                  <span>{r.name}</span>
                  {r.isSystem && <Badge tone="default">内置</Badge>}
                  {r.tenantId === null ? <Badge tone="primary">平台</Badge> : <Badge tone="info">{r.tenantName}</Badge>}
                </div>
              }
              extra={
                canManage && !r.isSystem ? (
                  <div className="row" style={{ gap: 4 }}>
                    <button className="btn btn-sm" onClick={() => openEdit(r)}>
                      编辑
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => removeRole(r)}>
                      删除
                    </button>
                  </div>
                ) : canManage ? (
                  <button className="btn btn-sm" onClick={() => openEdit(r)}>
                    查看
                  </button>
                ) : null
              }
            >
              <div className="small muted" style={{ marginBottom: 10 }}>
                {r.description || '暂无描述'} · <span className="mono">{r.code}</span>
              </div>

              <div className="row" style={{ gap: 6, marginBottom: 12 }}>
                <Badge tone="success">{r.permissions.length} 项权限</Badge>
                <Badge tone="info">{r.userCount} 个账号</Badge>
                <span className="small muted">创建于 {formatDate(r.createdAt)}</span>
              </div>

              <div className="row" style={{ gap: 6 }}>
                {r.permissions.slice(0, 8).map((p) => (
                  <Badge key={p} tone="default">
                    {p}
                  </Badge>
                ))}
                {r.permissions.length > 8 && <span className="small muted">+{r.permissions.length - 8}</span>}
              </div>

              {!isPlatform && null}
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <Modal
          title={editing ? `编辑角色 · ${editing.name}` : '新建角色'}
          maxWidth={640}
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
              {(!editing || !editing.isSystem) && (
                <button className="btn btn-primary" onClick={submit} disabled={saving}>
                  {saving ? '保存中…' : '保存'}
                </button>
              )}
            </>
          }
        >
          {err && <Alert>{err}</Alert>}
          {editing?.isSystem && <Alert tone="info">内置角色不可修改，仅可查看其权限配置。</Alert>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="角色名称">
              <input
                className="input"
                value={form.name}
                disabled={editing?.isSystem}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="角色编码">
              <input
                className="input"
                value={form.code}
                disabled={Boolean(editing)}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </Field>
          </div>
          <Field label="描述">
            <input
              className="input"
              value={form.description}
              disabled={editing?.isSystem}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <div style={{ marginTop: 6 }}>
            <div className="small muted" style={{ marginBottom: 10 }}>
              权限配置（共 {form.permissions.length} 项已选）
            </div>
            {groups.map((g) => (
              <div className="perm-group" key={g.module}>
                <div className="perm-group-title">{g.module}</div>
                <div className="perm-list">
                  {g.items.map((p) => {
                    const allowed = myPermissions.includes(p.code) || myPermissions.includes('tenant:create');
                    const checked = form.permissions.includes(p.code);
                    return (
                      <label className="perm-check" key={p.code} style={{ opacity: allowed ? 1 : 0.45 }}>
                        <input
                          type="checkbox"
                          disabled={!allowed || editing?.isSystem}
                          checked={checked}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              permissions: e.target.checked
                                ? [...form.permissions, p.code]
                                : form.permissions.filter((x) => x !== p.code),
                            })
                          }
                        />
                        <span>{p.name}</span>
                        <code>{p.code}</code>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
