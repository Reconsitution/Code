'use strict';

const store = require('../db/store');
const { badRequest, notFound, conflict, forbidden } = require('../utils/response');
const audit = require('./audit.service');

function decorate(sub) {
  const plan = store.findById('plans', sub.planId);
  const tenant = store.findById('tenants', sub.tenantId);
  return {
    ...sub,
    planName: plan ? plan.name : '-',
    planCode: plan ? plan.code : null,
    planPriceMonthly: plan ? plan.priceMonthly : 0,
    tenantName: tenant ? tenant.name : '-',
    tenantSlug: tenant ? tenant.slug : null,
    // 折算成月度金额，便于横向比较
    mrr: sub.billingCycle === 'yearly' ? Math.round((sub.unitAmount || 0) / 12) : sub.unitAmount || 0,
  };
}

function list(scope, { keyword, status, planId } = {}) {
  let items = store.collection('subscriptions').slice();
  if (!scope.isPlatform || scope.tenantId) {
    items = items.filter((s) => s.tenantId === scope.tenantId);
  }
  if (status) items = items.filter((s) => s.status === status);
  if (planId) items = items.filter((s) => s.planId === planId);
  if (keyword) {
    const k = keyword.toLowerCase();
    items = items.filter((s) => {
      const t = store.findById('tenants', s.tenantId);
      return t && (t.name.toLowerCase().includes(k) || t.slug.toLowerCase().includes(k));
    });
  }
  return items.map(decorate).sort((a, b) => b.mrr - a.mrr);
}

function changePlan(scope, tenantId, planId, actor, billingCycle) {
  const tenant = store.findById('tenants', tenantId);
  if (!tenant) throw notFound('租户不存在');
  if (!scope.isPlatform) throw forbidden('只有平台侧可以变更订阅');

  const plan = store.findById('plans', planId);
  if (!plan) throw notFound('套餐不存在');

  const sub = store.findOne('subscriptions', (s) => s.tenantId === tenantId);
  if (!sub) throw notFound('该租户还没有订阅记录');

  const cycle = billingCycle || sub.billingCycle;
  const amount = cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;

  const used = store.filter('users', (u) => u.tenantId === tenantId).length;
  if (used > plan.seats) {
    throw conflict(`目标套餐席位（${plan.seats}）小于当前已有账号数（${used}）`);
  }

  store.update('tenants', tenantId, { planId: plan.id, updatedAt: new Date().toISOString() });
  const updated = store.update('subscriptions', sub.id, {
    planId: plan.id,
    seats: plan.seats,
    unitAmount: amount,
    billingCycle: cycle,
    status: plan.code === 'trial' ? 'trialing' : 'active',
    updatedAt: new Date().toISOString(),
  });

  audit.record({
    actor,
    action: 'subscription.change',
    actionLabel: '变更订阅套餐',
    target: `${tenant.name} → ${plan.name}`,
    tenantId,
  });
  return decorate(updated);
}

function toggleAutoRenew(scope, id, actor) {
  const sub = store.findById('subscriptions', id);
  if (!sub) throw notFound('订阅不存在');
  if (!scope.isPlatform && sub.tenantId !== scope.tenantId) {
    throw forbidden('不允许操作其他租户的订阅');
  }
  const updated = store.update('subscriptions', id, {
    autoRenew: !sub.autoRenew,
    updatedAt: new Date().toISOString(),
  });
  audit.record({
    actor,
    action: 'subscription.auto-renew',
    actionLabel: updated.autoRenew ? '开启自动续费' : '关闭自动续费',
    target: sub.id,
    tenantId: sub.tenantId,
  });
  return decorate(updated);
}

function cancel(scope, id, actor) {
  const sub = store.findById('subscriptions', id);
  if (!sub) throw notFound('订阅不存在');
  if (!scope.isPlatform) throw forbidden('只有平台侧可以取消订阅');
  const updated = store.update('subscriptions', id, {
    status: 'canceled',
    autoRenew: false,
    canceledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  audit.record({ actor, action: 'subscription.cancel', actionLabel: '取消订阅', target: sub.id, tenantId: sub.tenantId });
  return decorate(updated);
}

module.exports = { list, changePlan, toggleAutoRenew, cancel, decorate };
