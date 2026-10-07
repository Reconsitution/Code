import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { useMediaQuery } from '../hooks/useRequest';
import { visibleMenu, findMenu, type MenuItem } from '../router/menu';
import {
  IconChevronLeft,
  IconChevronRight,
  IconLogout,
  IconMenu,
} from './icons';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { collapsed, drawerOpen, toggleCollapsed, setDrawer } = useUiStore();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // 路由变化时自动关闭移动端抽屉
  useEffect(() => {
    setDrawer(false);
  }, [location.pathname, setDrawer]);

  const items = visibleMenu(user?.permissions ?? [], Boolean(user?.isPlatform));
  const current = findMenu(location.pathname);
  const currentLabel = current ? current.label : '';

  const groups: Array<{ title: string; items: MenuItem[] }> = [];
  for (const item of items) {
    const g = groups.find((x) => x.title === item.group);
    if (g) g.items.push(item);
    else groups.push({ title: item.group, items: [item] });
  }

  const shellClass = [
    'app-shell',
    collapsed && !isMobile ? 'is-collapsed' : '',
    drawerOpen ? 'is-drawer-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClass}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">N</span>
          <span className="brand-text">
            <b>Nimbus 控制台</b>
            <span>{user?.isPlatform ? '平台运营端' : user?.tenantName}</span>
          </span>
        </div>

        <nav className="sidebar-nav">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="nav-group-title">{g.title}</div>
              {g.items.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                return (
                  <div
                    key={item.key}
                    className={`nav-item ${active ? 'is-active' : ''}`}
                    onClick={() => navigate(item.path)}
                    title={item.label}
                  >
                    <span className="nav-icon">
                      <Icon />
                    </span>
                    <span className="nav-label">{item.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <button className="collapse-btn" onClick={toggleCollapsed}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                justifyContent: 'center',
                width: '100%',
              }}
            >
              {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
              {!collapsed && <span>收起菜单</span>}
            </span>
          </button>
        </div>
      </aside>

      {drawerOpen && isMobile && (
        <button className="sidebar-backdrop" onClick={() => setDrawer(false)} aria-label="关闭菜单" />
      )}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setDrawer(!drawerOpen)} aria-label="菜单">
            <IconMenu />
          </button>
          <div className="crumbs">
            {user?.isPlatform ? '平台运营端' : '租户管理端'}
            {currentLabel && <span> / {currentLabel}</span>}
          </div>

          <div className="topbar-right">
            <div className="user-chip">
              <span className="avatar">{(user?.displayName || 'U').slice(0, 1)}</span>
              <span className="user-meta">
                <b>{user?.displayName}</b>
                <span>
                  {user?.roles.map((r) => r.name).join('、') || '-'}
                  {!user?.isPlatform && ` · ${user?.tenantName}`}
                </span>
              </span>
            </div>
            <button
              className="btn btn-sm"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="退出登录"
            >
              <IconLogout />
              <span className="nav-label">退出</span>
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
