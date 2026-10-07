import { useState } from 'react';
import { authApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import { Alert, Badge, Card, Field, StatCard } from '../components/ui';

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const submit = async () => {
    setMsg(null);
    if (newPassword.length < 6) {
      setMsg({ tone: 'error', text: '新密码至少 6 位' });
      return;
    }
    if (newPassword !== confirm) {
      setMsg({ tone: 'error', text: '两次输入的新密码不一致' });
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword(oldPassword, newPassword);
      setMsg({ tone: 'info', text: '密码修改成功' });
      setOldPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (e) {
      setMsg({ tone: 'error', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">个人中心</h1>
          <div className="page-desc">查看当前登录身份、所属角色与生效权限，并可修改登录密码。</div>
        </div>
      </div>

      <div className="grid grid-stats" style={{ marginBottom: 14 }}>
        <StatCard label="登录账号" value={user.username} icon="账" hint={user.email} />
        <StatCard label="所属组织" value={user.isPlatform ? '平台侧' : user.tenantName} icon="组" tone={user.isPlatform ? 'primary' : 'info'} />
        <StatCard label="角色" value={user.roles.map((r) => r.name).join('、') || '-'} icon="角" tone="success" />
        <StatCard label="生效权限数" value={user.permissions.length} icon="权" tone="warning" hint="菜单与按钮可见性依据" />
      </div>

      <div className="grid grid-2">
        <Card title="账号信息">
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 10, columnGap: 16, fontSize: 13.5 }}>
            <span className="muted">用户 ID</span>
            <span className="mono">{user.id}</span>
            <span className="muted">姓名</span>
            <span>{user.displayName}</span>
            <span className="muted">邮箱</span>
            <span>{user.email}</span>
            <span className="muted">租户标识</span>
            <span className="mono">{user.tenantSlug ?? '-'}</span>
            <span className="muted">账号状态</span>
            <span>
              <Badge tone={user.status === 'active' ? 'success' : 'danger'}>
                {user.status === 'active' ? '启用' : '停用'}
              </Badge>
            </span>
          </div>
        </Card>

        <Card title="修改密码">
          {msg && (
            <Alert tone={msg.tone === 'error' ? 'error' : 'info'}>
              {msg.text}
            </Alert>
          )}
          <Field label="原密码">
            <input className="input" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          </Field>
          <Field label="新密码（至少 6 位）">
            <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
          <Field label="确认新密码">
            <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? '提交中…' : '修改密码'}
          </button>
        </Card>
      </div>

      <Card title="我的权限清单" padded style={{ marginTop: 14 }}>
        <div className="row" style={{ gap: 6 }}>
          {user.permissions.map((p) => (
            <Badge key={p} tone="primary">
              {p}
            </Badge>
          ))}
        </div>
        <div className="small muted" style={{ marginTop: 10 }}>
          权限由角色叠加而来：{user.roles.map((r) => r.name).join(' + ') || '-'}
        </div>
      </Card>
    </div>
  );
}
