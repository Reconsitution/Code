import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import { Alert, Field } from '../components/ui';
import type { DemoAccount } from '../types';

const FEATURES = [
  { icon: '多', title: '平台 / 租户双视角', desc: '平台管理员统管全局，租户管理员只看自己的数据' },
  { icon: '权', title: 'RBAC 角色权限', desc: '20 个细粒度权限码，菜单与按钮按角色动态渲染' },
  { icon: '隔', title: '租户数据隔离', desc: '服务端强制注入租户作用域，越权请求一律拦截' },
  { icon: '计', title: '订阅与计费', desc: '套餐、席位、MRR、账单与用量一站式管理' },
];

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const status = useAuthStore((s) => s.status);

  const [account, setAccount] = useState('admin@platform.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demos, setDemos] = useState<DemoAccount[]>([]);
  const [demoPassword, setDemoPassword] = useState('');

  useEffect(() => {
    if (status === 'authed') navigate('/dashboard', { replace: true });
  }, [status, navigate]);

  useEffect(() => {
    authApi
      .demoAccounts()
      .then((res) => {
        setDemos(res.accounts);
        setDemoPassword(res.password);
        setPassword(res.password);
      })
      .catch(() => {
        /* 演示账号接口不可用时不影响登录 */
      });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!account || !password) {
      setError('请输入账号与密码');
      return;
    }
    setSubmitting(true);
    try {
      await login(account, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const fill = (demo: DemoAccount) => {
    setAccount(demo.email);
    setPassword(demoPassword);
  };

  return (
    <div className="login-page">
      <aside className="login-aside">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <span className="brand-mark" style={{ width: 34, height: 34, fontSize: 17 }}>
              N
            </span>
            <b style={{ fontSize: 16 }}>Nimbus 云控制台</b>
          </div>
          <h1>一套后台，管理所有租户</h1>
          <p style={{ marginTop: 10 }}>
            面向多租户 SaaS 产品的运营与管理中台，覆盖租户、账号、角色权限、订阅计费与数据概览。
          </p>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          {FEATURES.map((f) => (
            <div className="login-feature" key={f.title}>
              <span className="dot">{f.icon}</span>
              <div>
                <b style={{ fontSize: 14 }}>{f.title}</b>
                <p style={{ fontSize: 12.5 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, opacity: 0.7 }}>
          提示：分别用平台管理员与租户管理员登录，可以直观对比菜单与数据范围的差异。
        </p>
      </aside>

      <div className="login-panel">
        <div className="login-box">
          <h2>登录控制台</h2>
          <p className="muted" style={{ marginTop: 0, marginBottom: 20, fontSize: 13 }}>
            使用下方任一演示账号即可体验不同权限视角。
          </p>

          {error && <Alert>{error}</Alert>}

          <form onSubmit={submit}>
            <Field label="账号（用户名或邮箱）">
              <input
                className="input"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="admin@platform.local"
                autoComplete="username"
              />
            </Field>
            <Field label="密码">
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </Field>

            <button className="btn btn-primary" style={{ width: '100%', height: 38 }} disabled={submitting}>
              {submitting ? '登录中…' : '登录'}
            </button>
          </form>

          {demos.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div className="small muted" style={{ marginBottom: 8 }}>
                演示账号（点击填充，统一初始密码：<code className="mono">{demoPassword}</code>）
              </div>
              {demos.map((d) => (
                <div className="demo-account" key={d.email} onClick={() => fill(d)}>
                  <b>{d.label}</b>
                  <div>{d.email}</div>
                  <div style={{ opacity: 0.8 }}>{d.hint}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
