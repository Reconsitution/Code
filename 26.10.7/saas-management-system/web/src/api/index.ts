import { http } from './client';
import type {
  AuthUser,
  BillingOverview,
  DemoAccount,
  Invoice,
  LoginResult,
  Paged,
  PermissionItem,
  Plan,
  PlatformDashboard,
  Role,
  Subscription,
  Tenant,
  TenantDashboard,
  TenantDetail,
  AuditLog,
  UserItem,
} from '../types';

/* ------------------------------------------------------------ 认证 */
export const authApi = {
  login: (account: string, password: string) =>
    http.post<LoginResult>('/auth/login', { account, password }),
  me: () => http.get<AuthUser>('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    http.post<{ success: boolean }>('/auth/change-password', { oldPassword, newPassword }),
  permissions: () =>
    http.get<{ codes: string[]; groups: Array<{ module: string; items: PermissionItem[] }> }>(
      '/auth/permissions'
    ),
  demoAccounts: () => http.get<{ accounts: DemoAccount[]; password: string }>('/auth/demo-accounts'),
};

/* ------------------------------------------------------------ 租户 */
export const tenantApi = {
  list: (params: { page?: number; pageSize?: number; keyword?: string; status?: string; planId?: string }) =>
    http.get<Paged<Tenant>>('/tenants', params),
  me: () => http.get<TenantDetail | null>('/tenants/me'),
  detail: (id: string) => http.get<TenantDetail>(`/tenants/${id}`),
  create: (payload: Partial<Tenant>) => http.post<Tenant>('/tenants', payload),
  update: (id: string, payload: Partial<Tenant>) => http.patch<Tenant>(`/tenants/${id}`, payload),
  setStatus: (id: string, status: string) => http.post<Tenant>(`/tenants/${id}/status`, { status }),
};

/* ------------------------------------------------------------ 账号 */
export const userApi = {
  list: (params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: string;
    roleId?: string;
    tenantId?: string;
  }) => http.get<Paged<UserItem>>('/users', params),
  detail: (id: string) => http.get<UserItem>(`/users/${id}`),
  create: (payload: Partial<UserItem> & { password?: string; roleIds: string[]; tenantId?: string | null }) =>
    http.post<UserItem>('/users', payload),
  update: (id: string, payload: Partial<UserItem> & { roleIds?: string[] }) =>
    http.patch<UserItem>(`/users/${id}`, payload),
  remove: (id: string) => http.del<{ id: string }>(`/users/${id}`),
  resetPassword: (id: string, password?: string) =>
    http.post<{ id: string; tempPassword: string }>(`/users/${id}/reset-password`, { password }),
};

/* ------------------------------------------------------------ 角色 */
export const roleApi = {
  list: (params?: { tenantId?: string }) => http.get<Role[]>('/roles', params),
  permissions: () => http.get<{ permissions: PermissionItem[] }>('/roles/permissions'),
  create: (payload: Partial<Role>) => http.post<Role>('/roles', payload),
  update: (id: string, payload: Partial<Role>) => http.patch<Role>(`/roles/${id}`, payload),
  remove: (id: string) => http.del<{ id: string }>(`/roles/${id}`),
};

/* ------------------------------------------------------------ 套餐 */
export const planApi = {
  list: () => http.get<Plan[]>('/plans'),
  create: (payload: Partial<Plan>) => http.post<Plan>('/plans', payload),
  update: (id: string, payload: Partial<Plan>) => http.patch<Plan>(`/plans/${id}`, payload),
};

/* ------------------------------------------------------------ 订阅 */
export const subscriptionApi = {
  list: (params?: { keyword?: string; status?: string; planId?: string }) =>
    http.get<Subscription[]>('/subscriptions', params),
  changePlan: (tenantId: string, planId: string, billingCycle?: 'monthly' | 'yearly') =>
    http.post<Subscription>('/subscriptions/change-plan', { tenantId, planId, billingCycle }),
  toggleAutoRenew: (id: string) => http.post<Subscription>(`/subscriptions/${id}/auto-renew`),
  cancel: (id: string) => http.post<Subscription>(`/subscriptions/${id}/cancel`),
};

/* ------------------------------------------------------------ 计费 */
export const billingApi = {
  overview: () => http.get<BillingOverview>('/billing/overview'),
  invoices: (params: { page?: number; pageSize?: number; status?: string; tenantId?: string }) =>
    http.get<Paged<Invoice>>('/billing/invoices', params),
};

/* ------------------------------------------------------------ 仪表盘 */
export const dashboardApi = {
  platform: () => http.get<PlatformDashboard>('/dashboard/platform'),
  tenant: () => http.get<TenantDashboard>('/dashboard/tenant'),
  auditLogs: (params: { page?: number; pageSize?: number; keyword?: string }) =>
    http.get<Paged<AuditLog>>('/dashboard/audit-logs', params),
};
