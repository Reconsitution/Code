'use strict';

const config = require('../config');
const { BUILTIN_ROLES } = require('../domain/permissions');
const { hashPassword } = require('../utils/password');
const store = require('./store');

/**
 * 种子数据。使用固定种子的伪随机数，保证每次生成的数据一致，
 * 方便对照文档与截图。执行 `npm run seed -- --force` 可强制重播。
 */

function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const rng = createRng(20261007);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const between = (min, max) => Math.floor(min + rng() * (max - min + 1));

const DAY = 86400000;
const now = Date.now();
const daysAgo = (n) => new Date(now - n * DAY).toISOString();
const daysLater = (n) => new Date(now + n * DAY).toISOString();
const monthsAgo = (n) => {
  const d = new Date(now);
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
};

let counter = 0;
const nextId = (prefix) => `${prefix}_${String(++counter).padStart(4, '0')}`;

const DEFAULT_PASSWORD = config.seed.defaultPassword;

/* ------------------------------------------------------------------ 套餐 */
function buildPlans() {
  const defs = [
    {
      code: 'trial',
      name: '免费试用版',
      priceMonthly: 0,
      priceYearly: 0,
      seats: 5,
      features: ['5 个席位', '基础看板', '社区支持'],
    },
    {
      code: 'standard',
      name: '标准版',
      priceMonthly: 499,
      priceYearly: 4990,
      seats: 20,
      features: ['20 个席位', '完整看板', '邮件支持', '自定义角色'],
    },
    {
      code: 'pro',
      name: '专业版',
      priceMonthly: 1299,
      priceYearly: 12990,
      seats: 100,
      features: ['100 个席位', '高级报表', '工单支持', '自定义角色', '开放 API'],
    },
    {
      code: 'enterprise',
      name: '企业版',
      priceMonthly: 4999,
      priceYearly: 49990,
      seats: 500,
      features: ['500 个席位', '私有部署选项', '专属客户成功经理', 'SSO 单点登录', '审计日志导出'],
    },
  ];
  return defs.map((d) => ({
    id: nextId('pln'),
    ...d,
    status: 'active',
    sortOrder: defs.indexOf(d),
    createdAt: monthsAgo(14),
  }));
}

/* ------------------------------------------------------------------ 租户 */
const TENANT_DEFS = [
  { name: 'Acme 科技', slug: 'acme', plan: 'pro', status: 'active', contact: '陈嘉伟', email: 'chen.jiawei@acme.com', createdDaysAgo: 512, industry: '企业服务' },
  { name: 'Globex 环球', slug: 'globex', plan: 'enterprise', status: 'active', contact: '李婉清', email: 'li.wanqing@globex.com', createdDaysAgo: 470, industry: '跨境电商' },
  { name: 'Initech 软件', slug: 'initech', plan: 'standard', status: 'active', contact: '王皓', email: 'wang.hao@initech.com', createdDaysAgo: 388, industry: '软件开发' },
  { name: '优达教育', slug: 'udacity-cn', plan: 'trial', status: 'active', contact: '张思远', email: 'zhang.siyuan@udacity.cn', createdDaysAgo: 21, industry: '在线教育' },
  { name: '星野传媒', slug: 'hoshino', plan: 'pro', status: 'active', contact: '刘承宇', email: 'liu.chengyu@hoshino.media', createdDaysAgo: 300, industry: '数字营销' },
  { name: '云启物流', slug: 'yunqi', plan: 'standard', status: 'suspended', contact: '赵敏', email: 'zhao.min@yunqi.com', createdDaysAgo: 355, industry: '物流仓储' },
  { name: '蓝湖设计', slug: 'lanhu', plan: 'standard', status: 'active', contact: '孙可', email: 'sun.ke@lanhu.design', createdDaysAgo: 180, industry: '设计协作' },
  { name: '恒诚金融', slug: 'hengcheng', plan: 'enterprise', status: 'active', contact: '周正', email: 'zhou.zheng@hengcheng.com', createdDaysAgo: 265, industry: '金融服务' },
];

function buildTenants(plans) {
  return TENANT_DEFS.map((d) => {
    const plan = plans.find((p) => p.code === d.plan);
    return {
      id: nextId('tnt'),
      name: d.name,
      slug: d.slug,
      industry: d.industry,
      status: d.status,
      planId: plan.id,
      contactName: d.contact,
      contactEmail: d.email,
      contactPhone: `13${between(1, 9)}${String(between(0, 99999999)).padStart(8, '0')}`,
      remark: '',
      createdAt: daysAgo(d.createdDaysAgo),
      updatedAt: daysAgo(between(1, 30)),
    };
  });
}

/* ------------------------------------------------------------------ 角色 */
function buildRoles(tenants) {
  const roles = [];
  for (const tpl of BUILTIN_ROLES) {
    if (tpl.code.startsWith('platform')) {
      roles.push({
        id: nextId('rol'),
        tenantId: null,
        code: tpl.code,
        name: tpl.name,
        description: tpl.description,
        permissions: tpl.permissions.slice(),
        isSystem: true,
        createdAt: monthsAgo(15),
      });
    }
  }
  for (const tenant of tenants) {
    for (const tpl of BUILTIN_ROLES.filter((r) => r.code.startsWith('tenant'))) {
      roles.push({
        id: nextId('rol'),
        tenantId: tenant.id,
        code: tpl.code,
        name: tpl.name,
        description: tpl.description,
        permissions: tpl.permissions.slice(),
        isSystem: true,
        createdAt: tenant.createdAt,
      });
    }
  }
  // 两个租户各有一个自定义角色，用来演示自定义权限组合
  const acme = tenants[0];
  const globex = tenants[1];
  roles.push({
    id: nextId('rol'),
    tenantId: acme.id,
    code: 'finance_viewer',
    name: '财务只读',
    description: '只能查看订阅与账单，不能管理账号',
    permissions: ['dashboard:tenant:view', 'plan:view', 'subscription:view', 'invoice:view'],
    isSystem: false,
    createdAt: daysAgo(120),
  });
  roles.push({
    id: nextId('rol'),
    tenantId: globex.id,
    code: 'project_lead',
    name: '项目负责人',
    description: '可管理本租户账号但不能改角色',
    permissions: ['dashboard:tenant:view', 'user:view', 'user:create', 'user:update', 'role:view', 'plan:view', 'subscription:view'],
    isSystem: false,
    createdAt: daysAgo(96),
  });
  return roles;
}

/* ------------------------------------------------------------------ 用户 */
const GIVEN = ['嘉伟', '婉清', '皓', '思远', '承宇', '敏', '可', '正', '雨桐', '子墨', '一鸣', '佳琪', '沐辰', '书瑶', '睿', '若涵', '天翊', '语彤'];
const FAMILY = ['陈', '李', '王', '张', '刘', '赵', '孙', '周', '吴', '徐', '朱', '马', '胡', '郭', '林', '何', '高', '罗'];

function buildUsers(tenants, roles) {
  const users = [];
  const passwordHash = hashPassword(DEFAULT_PASSWORD);

  const platformAdmin = {
    id: nextId('usr'),
    tenantId: null,
    username: 'admin',
    email: 'admin@platform.local',
    displayName: '平台管理员',
    passwordHash,
    phone: '13800000001',
    status: 'active',
    isPlatform: true,
    roleIds: [roles.find((r) => r.code === 'platform_admin').id],
    createdAt: monthsAgo(15),
    lastLoginAt: daysAgo(0),
  };
  users.push(platformAdmin);

  users.push({
    id: nextId('usr'),
    tenantId: null,
    username: 'ops',
    email: 'ops@platform.local',
    displayName: '平台运营',
    passwordHash,
    phone: '13800000002',
    status: 'active',
    isPlatform: true,
    roleIds: [roles.find((r) => r.code === 'platform_support').id],
    createdAt: monthsAgo(12),
    lastLoginAt: daysAgo(2),
  });

  for (const tenant of tenants) {
    const tenantRoles = roles.filter((r) => r.tenantId === tenant.id);
    const adminRole = tenantRoles.find((r) => r.code === 'tenant_admin');
    const memberRole = tenantRoles.find((r) => r.code === 'tenant_member');
    const extraRoles = tenantRoles.filter((r) => !r.isSystem);

    const domain = tenant.contactEmail.split('@')[1];
    const total = between(4, 9);

    users.push({
      id: nextId('usr'),
      tenantId: tenant.id,
      username: `owner_${tenant.slug}`,
      email: tenant.contactEmail,
      displayName: tenant.contactName,
      passwordHash,
      phone: tenant.contactPhone,
      status: 'active',
      isPlatform: false,
      roleIds: [adminRole.id],
      createdAt: tenant.createdAt,
      lastLoginAt: daysAgo(between(0, 5)),
    });

    for (let i = 0; i < total; i += 1) {
      const name = pick(FAMILY) + pick(GIVEN);
      const role = i === 0 && extraRoles.length ? extraRoles[0] : memberRole;
      users.push({
        id: nextId('usr'),
        tenantId: tenant.id,
        username: `${tenant.slug}_user${i + 1}`,
        email: `user${i + 1}@${domain}`,
        displayName: name,
        passwordHash,
        phone: `13${between(1, 9)}${String(between(0, 99999999)).padStart(8, '0')}`,
        status: rng() > 0.15 ? 'active' : 'disabled',
        isPlatform: false,
        roleIds: [role.id],
        createdAt: daysAgo(between(1, Math.max(2, Math.floor((now - Date.parse(tenant.createdAt)) / DAY)))),
        lastLoginAt: rng() > 0.3 ? daysAgo(between(0, 20)) : null,
      });
    }
  }
  return users;
}

/* -------------------------------------------------------------- 订阅/账单 */
function buildSubscriptions(tenants, plans) {
  const subs = [];
  for (const tenant of tenants) {
    const plan = plans.find((p) => p.id === tenant.planId);
    const isTrial = plan.code === 'trial';
    const billingCycle = plan.code === 'enterprise' ? 'yearly' : rng() > 0.7 ? 'yearly' : 'monthly';
    const amount = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    let status = 'active';
    if (isTrial) status = 'trialing';
    else if (tenant.status === 'suspended') status = 'past_due';
    else if (rng() > 0.88) status = 'past_due';
    else if (rng() > 0.95) status = 'canceled';

    subs.push({
      id: nextId('sub'),
      tenantId: tenant.id,
      planId: plan.id,
      status,
      billingCycle,
      seats: plan.seats,
      unitAmount: amount,
      currency: 'CNY',
      startedAt: tenant.createdAt,
      currentPeriodStart: daysAgo(between(1, 28)),
      currentPeriodEnd: daysLater(between(2, 30)),
      trialEndsAt: isTrial ? daysLater(14) : null,
      autoRenew: status !== 'canceled' && rng() > 0.2,
      canceledAt: status === 'canceled' ? daysAgo(between(3, 40)) : null,
      createdAt: tenant.createdAt,
      updatedAt: daysAgo(between(0, 20)),
    });
  }
  return subs;
}

function buildInvoices(subscriptions, tenants) {
  const invoices = [];
  for (const sub of subscriptions) {
    if (sub.status === 'canceled') continue;
    const tenant = tenants.find((t) => t.id === sub.tenantId);
    const months = sub.billingCycle === 'yearly' ? 1 : 6;
    for (let i = months; i >= 1; i -= 1) {
      const issued = monthsAgo(i);
      const amount = sub.unitAmount || 0;
      const isOpen = i === 1 && rng() > 0.75;
      invoices.push({
        id: nextId('inv'),
        tenantId: sub.tenantId,
        subscriptionId: sub.id,
        number: `INV-${tenant.slug.toUpperCase()}-${String(1000 + Math.floor(rng() * 8999))}`,
        amount,
        currency: 'CNY',
        status: amount === 0 ? 'free' : isOpen ? 'open' : 'paid',
        issuedAt: issued,
        dueAt: issued,
        paidAt: amount === 0 || isOpen ? null : issued,
        periodLabel: new Date(issued).toISOString().slice(0, 7),
        createdAt: issued,
      });
    }
  }
  return invoices;
}

/* ------------------------------------------------------------------ 用量 */
function buildUsage(tenants) {
  const usage = [];
  for (const tenant of tenants) {
    for (let d = 29; d >= 0; d -= 1) {
      const base = between(1200, 9000);
      usage.push({
        id: nextId('usg'),
        tenantId: tenant.id,
        date: new Date(now - d * DAY).toISOString().slice(0, 10),
        apiCalls: base + between(0, 2500),
        activeUsers: between(3, 42),
        storageGb: Number((between(20, 260) + rng()).toFixed(1)),
      });
    }
  }
  return usage;
}

/* -------------------------------------------------------------- 审计日志 */
const ACTIONS = [
  ['tenant.create', '创建租户'],
  ['tenant.update', '更新租户资料'],
  ['tenant.suspend', '停用租户'],
  ['tenant.activate', '启用租户'],
  ['user.create', '新建账号'],
  ['user.update', '编辑账号'],
  ['user.disable', '停用账号'],
  ['user.reset-password', '重置密码'],
  ['role.update', '调整角色权限'],
  ['subscription.change', '变更订阅套餐'],
  ['invoice.mark-paid', '标记账单已支付'],
  ['auth.login', '登录系统'],
];

function buildAuditLogs(users, tenants) {
  const logs = [];
  const tenantUsers = users.filter((u) => !u.isPlatform);
  for (let i = 0; i < 80; i += 1) {
    const actor = i % 3 === 0 ? users[0] : pick(tenantUsers);
    const [action, actionLabel] = pick(ACTIONS);
    const tenant = tenants.find((t) => t.id === actor.tenantId) || pick(tenants);
    logs.push({
      id: nextId('log'),
      actorId: actor.id,
      actorName: actor.displayName,
      actorEmail: actor.email,
      tenantId: actor.isPlatform ? tenant.id : actor.tenantId,
      tenantName: tenant.name,
      action,
      actionLabel,
      target: action.startsWith('tenant') ? tenant.name : actor.displayName,
      ip: `10.${between(0, 60)}.${between(0, 255)}.${between(1, 254)}`,
      createdAt: new Date(now - Math.floor(rng() * 14 * DAY)).toISOString(),
    });
  }
  return logs.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/* ------------------------------------------------------------------ 组装 */
function seedDatabase() {
  counter = 0;
  const plans = buildPlans();
  const tenants = buildTenants(plans);
  const roles = buildRoles(tenants);
  const users = buildUsers(tenants, roles);
  const subscriptions = buildSubscriptions(tenants, plans);
  const invoices = buildInvoices(subscriptions, tenants);
  const usage = buildUsage(tenants);
  const auditLogs = buildAuditLogs(users, tenants);

  return { plans, tenants, roles, users, subscriptions, invoices, usage, auditLogs };
}

module.exports = seedDatabase;

if (require.main === module) {
  const force = process.argv.includes('--force');
  const fs = require('fs');
  if (force && fs.existsSync(config.db.file)) {
    fs.unlinkSync(config.db.file);
    console.log('[seed] 已删除旧数据文件');
  }
  store.load();
  const data = store.raw();
  console.log('[seed] 播种完成：');
  for (const [key, value] of Object.entries(data)) {
    console.log(`  - ${key}: ${value.length} 条`);
  }
  console.log(`[seed] 统一初始密码：${DEFAULT_PASSWORD}`);
  console.log('[seed] 平台管理员：admin@platform.local');
  console.log('[seed] 平台运营  ：ops@platform.local');
  console.log('[seed] 租户管理员：owner_acme@acme.com (示例)');
  process.exit(0);
}
