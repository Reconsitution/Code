export type PermissionScope = 'platform' | 'tenant' | 'both';

export interface PermissionItem {
  code: string;
  name: string;
  module: string;
  scope: PermissionScope;
}

export interface RoleRef {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
}

export interface Role extends RoleRef {
  tenantId: string | null;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  tenantName: string;
  userCount: number;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  tenantId: string | null;
  tenantName: string;
  tenantSlug: string | null;
  isPlatform: boolean;
  status: string;
  roles: RoleRef[];
  permissions: string[];
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface DemoAccount {
  email: string;
  label: string;
  hint: string;
  username: string;
  exists: boolean;
}

export type TenantStatus = 'active' | 'suspended';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  industry: string;
  status: TenantStatus;
  planId: string;
  planName: string;
  planCode: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
  subscriptionStatus: SubscriptionStatus | null;
  seats: number;
  userCount: number;
}

export interface TenantDetail extends Tenant {
  subscription: Subscription | null;
  users: Array<{
    id: string;
    displayName: string;
    email: string;
    status: string;
    lastLoginAt: string | null;
    roles: string[];
  }>;
  usage: Array<{ id: string; date: string; apiCalls: number; activeUsers: number; storageGb: number }>;
}

export interface UserItem {
  id: string;
  username: string;
  email: string;
  displayName: string;
  phone: string;
  status: string;
  isPlatform: boolean;
  tenantId: string | null;
  tenantName: string;
  roles: Array<{ id: string; code: string; name: string }>;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  seats: number;
  features: string[];
  status: string;
  sortOrder: number;
  tenantCount: number;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: 'monthly' | 'yearly';
  seats: number;
  unitAmount: number;
  currency: string;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  autoRenew: boolean;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  planName: string;
  planCode: string | null;
  planPriceMonthly: number;
  tenantName: string;
  tenantSlug: string | null;
  mrr: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  subscriptionId: string;
  number: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'free';
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  periodLabel: string;
  tenantName: string;
  tenantSlug: string | null;
}

export interface BillingOverview {
  mrr: number;
  arr: number;
  arpu: number;
  churnRate: number;
  counts: {
    subscriptions: number;
    active: number;
    trialing: number;
    pastDue: number;
    canceled: number;
  };
  collected: { total: number; trend: Array<{ label: string; value: number }> };
  outstanding: { total: number; count: number };
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string;
  tenantId: string | null;
  tenantName: string | null;
  action: string;
  actionLabel: string;
  target: string;
  ip: string;
  createdAt: string;
}

export interface PlatformDashboard {
  stats: {
    tenantTotal: number;
    tenantActive: number;
    tenantSuspended: number;
    userTotal: number;
    mrr: number;
    arr: number;
    arpu: number;
    newTenantThisMonth: number;
    outstanding: number;
  };
  growth: Array<{ label: string; value: number }>;
  planDistribution: Array<{ name: string; value: number }>;
  statusDistribution: Array<{ name: string; value: number }>;
  revenueTrend: Array<{ label: string; value: number }>;
  topTenants: Array<{
    id: string;
    name: string;
    slug: string;
    planName: string;
    status: string;
    seats: number;
    used: number;
    mrr: number;
  }>;
  recentLogs: AuditLog[];
}

export interface TenantDashboard {
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    industry: string;
    contactName: string;
    createdAt: string;
  };
  stats: {
    userTotal: number;
    seats: number;
    seatUsage: number;
    activeUsers: number;
    disabledUsers: number;
    planName: string;
    subscriptionStatus: string | null;
    currentPeriodEnd: string | null;
    mrr: number;
    lastPaidAmount: number;
  };
  usage: Array<{ label: string; apiCalls: number; activeUsers: number }>;
  roleDistribution: Array<{ name: string; value: number }>;
  invoices: Invoice[];
  recentLogs: AuditLog[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: unknown;
}
