'use strict';

const store = require('../db/store');

const MONTH_LABEL = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

function monthlyAmount(sub) {
  return sub.billingCycle === 'yearly' ? (sub.unitAmount || 0) / 12 : sub.unitAmount || 0;
}

/**
 * 计费概览：MRR / ARR、活跃订阅、逾期、流失、近 6 个月实收。
 * 金额统一折算为「月度」，年付订阅除以 12。
 */
function overview(scope) {
  let subs = store.collection('subscriptions').slice();
  if (!scope.isPlatform || scope.tenantId) {
    subs = subs.filter((s) => s.tenantId === scope.tenantId);
  }

  const active = subs.filter((s) => s.status === 'active' || s.status === 'trialing');
  const pastDue = subs.filter((s) => s.status === 'past_due');
  const canceled = subs.filter((s) => s.status === 'canceled');
  const trialing = subs.filter((s) => s.status === 'trialing');

  const mrr = Math.round(active.reduce((sum, s) => sum + monthlyAmount(s), 0));
  const arr = mrr * 12;
  const arpu = active.length ? Math.round(mrr / active.length) : 0;
  const churnRate = subs.length ? Number(((canceled.length / subs.length) * 100).toFixed(1)) : 0;

  // 近 6 个月实收（按账单 paidAt 归集）
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: MONTH_LABEL(d), value: 0 });
  }
  const monthIndex = new Map(months.map((m, i) => [m.label, i]));

  let invoices = store.collection('invoices').slice();
  if (!scope.isPlatform || scope.tenantId) {
    invoices = invoices.filter((inv) => inv.tenantId === scope.tenantId);
  }
  let collectedTotal = 0;
  let openTotal = 0;
  let openCount = 0;
  for (const inv of invoices) {
    if (inv.status === 'paid') {
      if (inv.paidAt) {
        const label = MONTH_LABEL(new Date(inv.paidAt));
        if (monthIndex.has(label)) months[monthIndex.get(label)].value += inv.amount;
      }
      collectedTotal += inv.amount;
    } else if (inv.status === 'open') {
      openTotal += inv.amount;
      openCount += 1;
    }
  }

  return {
    mrr,
    arr,
    arpu,
    churnRate,
    counts: {
      subscriptions: subs.length,
      active: active.length,
      trialing: trialing.length,
      pastDue: pastDue.length,
      canceled: canceled.length,
    },
    collected: {
      total: collectedTotal,
      trend: months.map((m) => ({ label: m.label, value: Math.round(m.value) })),
    },
    outstanding: { total: openTotal, count: openCount },
  };
}

function listInvoices(scope, { page = 1, pageSize = 10, status, tenantId } = {}) {
  let items = store.collection('invoices').slice();
  if (!scope.isPlatform || scope.tenantId) {
    items = items.filter((i) => i.tenantId === scope.tenantId);
  } else if (tenantId) {
    items = items.filter((i) => i.tenantId === tenantId);
  }
  if (status) items = items.filter((i) => i.status === status);

  items = items
    .map((inv) => {
      const tenant = store.findById('tenants', inv.tenantId);
      return { ...inv, tenantName: tenant ? tenant.name : '-', tenantSlug: tenant ? tenant.slug : null };
    })
    .sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt));

  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page, pageSize };
}

module.exports = { overview, listInvoices };
