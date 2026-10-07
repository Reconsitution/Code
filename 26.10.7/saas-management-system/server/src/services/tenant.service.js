'use strict';

const store = require('../db/store');
const { badRequest, notFound, conflict, forbidden } = require('../utils/response');
const { scopedList } = require('../middleware/scope');
const audit = require('./audit.service');

function decorate(tenant) {
  const plan = store.findById('plans', tenant.planId);
  const subscription = store.findOne('subscriptions', (s) => s.tenantId === tenant.id);
  const userCount = store.filter('users', (u) => u.tenantId === tenant.id).length;
  return {
    ...tenant,
    planName: plan ? plan.name : '-',
    planCode: plan ? plan.code : null,
    subscriptionStatus: subscription ? subscription.status : null,
    seats: subscription ? subscription.seats : plan ? plan.seats : 0,
    userCount,
  };
}

function list(scope, { page = 1, pageSize = 10, keyword, status, planId } = {}) {
  let items = store.collection('tenants').slice();
  // 平台侧默认看全部；租户侧只能看到自己
  if (!scope.isPlatform) {
    items = items.filter((t) => t.id === scope.tenantId);
  }
  if (keyword) {
    const k = keyword.toLowerCase();
    items = items.filter(
      (t) =>
        t.name.toLowerCase().includes(k) ||
        t.slug.toLowerCase().includes(k) ||
        (t.contactEmail || '').toLowerCase().includes(k)
    );
  }
  if (status) items = items.filter((t) => t.status === status);
  if (planId) items = items.filter((t) => t.planId === planId);

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(start, start + pageSize)
    .map(decorate);

  return { items: paged, total, page, pageSize };
}

function getById(scope, id) {
  const tenant = store.findById('tenants', id);
  if (!tenant) throw notFound('租户不存在');
  if (!scope.isPlatform && scope.tenantId !== tenant.id) {
    throw forbidden('不允许访问其他租户的数据');
  }
  const base = decorate(tenant);
  const subscription = store.findOne('subscriptions', (s) => s.tenantId === tenant.id);
  const users = store.filter('users', (u) => u.tenantId === tenant.id);
  const usage = store
    .filter('usage', (u) => u.tenantId === tenant.id)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return {
    ...base,
    subscription,
    users: users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      email: u.email,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      roles: u.roleIds.map((rid) => {
        const r = store.findById('roles', rid);
        return r ? r.name : '-';
      }),
    })),
    usage,
  };
}

function create(payload, actor) {
  const { name, slug, planId, contactName, contactEmail, contactPhone, industry, remark } = payload;
  if (!name || !slug) throw badRequest('租户名称与标识不能为空');
  if (store.findOne('tenants', (t) => t.slug === slug)) {
    throw conflict('租户标识已被占用');
  }
  const plan = planId ? store.findById('plans', planId) : store.findOne('plans', (p) => p.code === 'trial');
  if (!plan) throw badRequest('请选择有效的套餐');

  const nowIso = new Date().toISOString();
  const tenant = store.insert('tenants', {
    id: `tnt_${Date.now().toString(36)}`,
    name,
    slug,
    industry: industry || '',
    status: 'active',
    planId: plan.id,
    contactName: contactName || '',
    contactEmail: contactEmail || '',
    contactPhone: contactPhone || '',
    remark: remark || '',
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // 为新租户实例化内置角色
  const builtin = store.filter('roles', (r) => r.tenantId === null && r.code.startsWith('tenant'));
  for (const tpl of builtin) {
    store.insert('roles', {
      id: `rol_${Date.now().toString(36)}_${tpl.code}`,
      tenantId: tenant.id,
      code: tpl.code,
      name: tpl.name,
      description: tpl.description,
      permissions: tpl.permissions.slice(),
      isSystem: true,
      createdAt: nowIso,
    });
  }

  // 默认开通订阅
  store.insert('subscriptions', {
    id: `sub_${Date.now().toString(36)}`,
    tenantId: tenant.id,
    planId: plan.id,
    status: plan.code === 'trial' ? 'trialing' : 'active',
    billingCycle: 'monthly',
    seats: plan.seats,
    unitAmount: plan.priceMonthly,
    currency: 'CNY',
    startedAt: nowIso,
    currentPeriodStart: nowIso,
    currentPeriodEnd: nowIso,
    trialEndsAt: plan.code === 'trial' ? new Date(Date.now() + 14 * 86400000).toISOString() : null,
    autoRenew: true,
    canceledAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  audit.record({
    actor,
    action: 'tenant.create',
    actionLabel: '创建租户',
    target: tenant.name,
    tenantId: tenant.id,
  });
  return decorate(tenant);
}

function update(scope, id, patch, actor) {
  const tenant = store.findById('tenants', id);
  if (!tenant) throw notFound('租户不存在');
  if (!scope.isPlatform && scope.tenantId !== id) throw forbidden('不允许修改其他租户的数据');

  const allowed = ['name', 'industry', 'contactName', 'contactEmail', 'contactPhone', 'remark'];
  const next = {};
  for (const key of allowed) if (patch[key] !== undefined) next[key] = patch[key];
  next.updatedAt = new Date().toISOString();

  const updated = store.update('tenants', id, next);
  audit.record({ actor, action: 'tenant.update', actionLabel: '更新租户资料', target: updated.name, tenantId: id });
  return decorate(updated);
}

function setStatus(scope, id, status, actor) {
  if (!['active', 'suspended'].includes(status)) throw badRequest('状态值不合法');
  const tenant = store.findById('tenants', id);
  if (!tenant) throw notFound('租户不存在');
  if (!scope.isPlatform) throw forbidden('只有平台侧可以停用租户');

  const updated = store.update('tenants', id, { status, updatedAt: new Date().toISOString() });
  audit.record({
    actor,
    action: status === 'suspended' ? 'tenant.suspend' : 'tenant.activate',
    actionLabel: status === 'suspended' ? '停用租户' : '启用租户',
    target: updated.name,
    tenantId: id,
  });
  return decorate(updated);
}

function summary() {
  const tenants = store.collection('tenants');
  const byStatus = { active: 0, suspended: 0 };
  for (const t of tenants) byStatus[t.status] = (byStatus[t.status] || 0) + 1;
  const byPlan = {};
  for (const t of tenants) {
    const plan = store.findById('plans', t.planId);
    const key = plan ? plan.name : '未知';
    byPlan[key] = (byPlan[key] || 0) + 1;
  }
  return { total: tenants.length, byStatus, byPlan };
}

module.exports = { list, getById, create, update, setStatus, summary, decorate, scopedList };
