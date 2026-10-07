import { useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import TenantDetail from './pages/TenantDetail';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Plans from './pages/Plans';
import Billing from './pages/Billing';
import AuditLogs from './pages/AuditLogs';
import Profile from './pages/Profile';
import { Forbidden, NotFound } from './pages/Misc';

/** 登录守卫 */
function RequireAuth() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === 'anon') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Layout />;
}

/** 权限守卫：菜单与路由共用同一套权限码，避免"菜单藏了但直接输 URL 还能进" */
function Guard({
  permAny,
  platformOnly,
  children,
}: {
  permAny?: string[];
  platformOnly?: boolean;
  children: ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (platformOnly && !user.isPlatform) return <Navigate to="/403" replace />;
  if (permAny && permAny.length && !permAny.some((p) => user.permissions.includes(p))) {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const status = useAuthStore((s) => s.status);
  const refresh = useAuthStore((s) => s.refresh);

  useEffect(() => {
    if (status === 'idle') void refresh();
  }, [status, refresh]);

  if (status === 'idle') {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div className="loading-block">
          <span className="spinner" />
          正在恢复登录状态…
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/403" element={<Forbidden />} />

      <Route path="/" element={<RequireAuth />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <Guard permAny={['dashboard:platform:view', 'dashboard:tenant:view']}>
              <Dashboard />
            </Guard>
          }
        />
        <Route
          path="tenants"
          element={
            <Guard permAny={['tenant:view']} platformOnly>
              <Tenants />
            </Guard>
          }
        />
        <Route
          path="tenants/:id"
          element={
            <Guard permAny={['tenant:view']} platformOnly>
              <TenantDetail />
            </Guard>
          }
        />
        <Route
          path="users"
          element={
            <Guard permAny={['user:view']}>
              <Users />
            </Guard>
          }
        />
        <Route
          path="roles"
          element={
            <Guard permAny={['role:view', 'role:manage']}>
              <Roles />
            </Guard>
          }
        />
        <Route
          path="plans"
          element={
            <Guard permAny={['plan:view', 'subscription:view']}>
              <Plans />
            </Guard>
          }
        />
        <Route
          path="billing"
          element={
            <Guard permAny={['invoice:view']}>
              <Billing />
            </Guard>
          }
        />
        <Route
          path="audit"
          element={
            <Guard permAny={['audit:view']} platformOnly>
              <AuditLogs />
            </Guard>
          }
        />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
