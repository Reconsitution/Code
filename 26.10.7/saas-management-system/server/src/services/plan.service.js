'use strict';

const store = require('../db/store');
const { badRequest, notFound, conflict } = require('../utils/response');
const audit = require('./audit.service');

function decorate(plan) {
  const tenantCount = store.filter('tenants', (t) => t.planId === plan.id).length;
  return { ...plan, tenantCount };
}

function list() {
  return store
    .collection('plans')
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(decorate);
}

function getById(id) {
  const plan = store.findById('plans', id);
  if (!plan) throw notFound('套餐不存在');
  return decorate(plan);
}

function create(payload, actor) {
  const { name, code, priceMonthly, priceYearly, seats, features } = payload;
  if (!name || !code) throw badRequest('套餐名称与编码不能为空');
  if (store.findOne('plans', (p) => p.code === code)) throw conflict('套餐编码已存在');

  const plan = store.insert('plans', {
    id: `pln_${Date.now().toString(36)}`,
    code,
    name,
    priceMonthly: Number(priceMonthly || 0),
    priceYearly: Number(priceYearly || 0),
    seats: Number(seats || 1),
    features: features || [],
    status: 'active',
    sortOrder: store.collection('plans').length,
    createdAt: new Date().toISOString(),
  });
  audit.record({ actor, action: 'plan.create', actionLabel: '新建套餐', target: plan.name });
  return decorate(plan);
}

function update(id, patch, actor) {
  const plan = store.findById('plans', id);
  if (!plan) throw notFound('套餐不存在');
  const allowed = ['name', 'priceMonthly', 'priceYearly', 'seats', 'features', 'status'];
  const next = {};
  for (const key of allowed) if (patch[key] !== undefined) next[key] = patch[key];
  const updated = store.update('plans', id, next);
  audit.record({ actor, action: 'plan.update', actionLabel: '编辑套餐', target: updated.name });
  return decorate(updated);
}

module.exports = { list, getById, create, update, decorate };
