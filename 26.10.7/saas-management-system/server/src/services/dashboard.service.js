'use strict';

const store = require('../db/store');
const billing = require('./billing.service');
const auditService = require('./audit.service');

const MONTH_LABEL = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

function lastNMonths(n) {
  const now = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ label: MONTH_LABEL(d), value: 0 });
  }
  return out;
}

/** 平台总览 —— 只有平台侧角色能看到 */
function platform(scope) {
  const tenants = store.collection('tenants');
  const users = store.collection('users').filter((u) => !u.isPlatform);
  const billingOverview = billing.overview(scope);

  const growth = lastNMonths(12);
  const growthIndex = new Map(growth.map((g, i) => [g.label, i]));
  for (const t of tenants) {
    const label = MONTH_LABEL(new Date(t.createdAt));
    if (growthIndex.has(label)) growth[growthIndex.get(label)].value += 1;
  }

  const planDistribution = store
    .collection('plans')
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({
      name: p.name,
      value: tenants.filter((t) => t.planId === p.id).length,
    }))
    .filter((d) => d.value > 0);

  const statusDistribution = ['active', 'trialing', 'past_due', 'canceled'].map((status) => ({
    name: status,
    value: store.filter('subscriptions', (s) => s.status === status).length,
  }));

  const topTenants = billingOverview
    ? store
        .collection('subscriptions')
        .slice()
        .map((s) => {
          const tenant = store.findById('tenants', s.tenantId);
          const plan = store.findById('plans', s.planId);
          return {
            id: s.tenantId,
            name: tenant ? tenant.name : '-',
            slug: tenant ? tenant.slug : '',
            planName: plan ? plan.name : '-',
            status: s.status,
            seats: s.seats,
            used: store.filter('users', (u) => u.tenantId === s.tenantId).length,
            mrr: s.billingCycle === 'yearly' ? Math.round((s.unitAmount || 0) / 12) : s.unitAmount || 0,
          };
        })
        .sort((a, b) => b.mrr - a.mrr)
        .slice(0, 6)
    : [];

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const newThisMonth = tenants.filter((t) => Date.parse(t.createdAt) >= monthStart).length;

  return {
    stats: {
      tenantTotal: tenants.length,
      tenantActive: tenants.filter((t) => t.status === 'active').length,
      tenantSuspended: tenants.filter((t) => t.status === 'suspended').length,
      userTotal: users.length,
      mrr: billingOverview.mrr,
      arr: billingOverview.arr,
      arpu: billingOverview.arpu,
      newTenantThisMonth: newThisMonth,
      outstanding: billingOverview.outstanding.total,
    },
    growth,
    planDistribution,
    statusDistribution,
    revenueTrend: billingOverview.collected.trend,
    topTenants,
    recentLogs: auditService.list(scope, { pageSize: 8 }).items,
  };
}

/** 租户自服务概览 —— 数据严格限定在自己的 tenantId 内 */
function tenant(scope) {
  const tenantId = scope.tenantId;
  const tenant = store.findById('tenants', tenantId);
  if (!tenant) return null;

  const sub = store.findOne('subscriptions', (s) => s.tenantId === tenantId);
  const plan = sub ? store.findById('plans', sub.planId) : null;
  const users = store.filter('users', (u) => u.tenantId === tenantId);
  const seats = sub ? sub.seats : 0;
  const used = users.length;

  const usage = store
    .filter('usage', (u) => u.tenantId === tenantId)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-14);

  const roleDistribution = store
    .filter('roles', (r) => r.tenantId === tenantId)
    .map((r) => ({
      name: r.name,
      value: users.filter((u) => u.roleIds.includes(r.id)).length,
    }))
    .filter((d) => d.value > 0);

  const invoices = store
    .filter('invoices', (i) => i.tenantId === tenantId)
    .sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt))
    .slice(0, 5);

  const lastPaid = store
    .filter('invoices', (i) => i.tenantId === tenantId && i.status === 'paid')
    .sort((a, b) => Date.parse(b.paidAt || b.issuedAt) - Date.parse(a.paidAt || a.issuedAt))[0];

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      industry: tenant.industry,
      contactName: tenant.contactName,
      createdAt: tenant.createdAt,
    },
    stats: {
      userTotal: used,
      seats,
      seatUsage: seats ? Math.round((used / seats) * 100) : 0,
      activeUsers: users.filter((u) => u.status === 'active').length,
      disabledUsers: users.filter((u) => u.status !== 'active').length,
      planName: plan ? plan.name : '-',
      subscriptionStatus: sub ? sub.status : null,
      currentPeriodEnd: sub ? sub.currentPeriodEnd : null,
      mrr: sub ? (sub.billingCycle === 'yearly' ? Math.round((sub.unitAmount || 0) / 12) : sub.unitAmount || 0) : 0,
      lastPaidAmount: lastPaid ? lastPaid.amount : 0,
    },
    usage: usage.map((u) => ({ label: u.date.slice(5), apiCalls: u.apiCalls, activeUsers: u.activeUsers })),
    roleDistribution,
    invoices,
    recentLogs: auditService.list(scope, { pageSize: 6 }).items,
  };
}

module.exports = { platform, tenant };
