'use strict';

const store = require('../db/store');
const { badRequest, notFound, conflict, forbidden } = require('../utils/response');
const { hashPassword } = require('../utils/password');
const audit = require('./audit.service');

function decorate(user) {
  const roles = user.roleIds
    .map((rid) => store.findById('roles', rid))
    .filter(Boolean)
    .map((r) => ({ id: r.id, code: r.code, name: r.name }));
  const tenant = user.tenantId ? store.findById('tenants', user.tenantId) : null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    phone: user.phone,
    status: user.status,
    isPlatform: Boolean(user.isPlatform),
    tenantId: user.tenantId,
    tenantName: tenant ? tenant.name : '平台',
    roles,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

function list(scope, { page = 1, pageSize = 10, keyword, status, roleId, tenantId } = {}) {
  let items = store.collection('users').slice();

  // 租户侧永远只能看到自己租户的人
  if (!scope.isPlatform) {
    items = items.filter((u) => u.tenantId === scope.tenantId);
  } else if (scope.tenantId) {
    items = items.filter((u) => u.tenantId === scope.tenantId);
  } else if (tenantId) {
    items = items.filter((u) => u.tenantId === tenantId);
  }

  if (keyword) {
    const k = keyword.toLowerCase();
    items = items.filter(
      (u) =>
        (u.displayName || '').toLowerCase().includes(k) ||
        (u.email || '').toLowerCase().includes(k) ||
        (u.username || '').toLowerCase().includes(k)
    );
  }
  if (status) items = items.filter((u) => u.status === status);
  if (roleId) items = items.filter((u) => u.roleIds.includes(roleId));

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(start, start + pageSize)
    .map(decorate);
  return { items: paged, total, page, pageSize };
}

function getById(scope, id) {
  const user = store.findById('users', id);
  if (!user) throw notFound('账号不存在');
  if (!scope.isPlatform && user.tenantId !== scope.tenantId) {
    throw forbidden('不允许访问其他租户的数据');
  }
  return decorate(user);
}

/** 角色是否可以被当前操作者分配 */
function assertRolesAssignable(scope, actor, roleIds, targetTenantId) {
  const resolved = roleIds.map((rid) => {
    const role = store.findById('roles', rid);
    if (!role) throw badRequest(`角色不存在：${rid}`);
    // 平台内置角色只能给平台侧用户；租户角色只能给同租户用户
    if (role.tenantId === null && targetTenantId !== null) {
      throw badRequest('不能把平台内置角色分配给租户账号');
    }
    if (role.tenantId !== null && role.tenantId !== targetTenantId) {
      throw forbidden('不能分配其他租户的角色');
    }
    return role;
  });

  // 防越权：不能授予自己没有的权限（平台超级管理员视为拥有全部）
  const actorSet = new Set(actor.permissions);
  const isSuperAdmin = actor.permissions.includes('tenant:create');
  if (!isSuperAdmin) {
    for (const role of resolved) {
      for (const p of role.permissions) {
        if (!actorSet.has(p)) {
          throw forbidden(`不能授予自己不具备的权限：${p}`);
        }
      }
    }
  }
  return resolved;
}

function create(scope, payload, actor) {
  const { username, email, displayName, phone, password, roleIds, tenantId } = payload;
  if (!username || !email) throw badRequest('用户名与邮箱不能为空');
  if (!roleIds || !roleIds.length) throw badRequest('请至少选择一个角色');

  const targetTenantId = scope.isPlatform ? tenantId || null : scope.tenantId;
  if (scope.isPlatform && !tenantId) {
    // 平台自建账号：归入平台侧（tenantId 为 null）
  }
  if (!scope.isPlatform && tenantId && tenantId !== scope.tenantId) {
    throw forbidden('不能在其它租户下创建账号');
  }

  const key = username.toLowerCase();
  if (store.findOne('users', (u) => u.username.toLowerCase() === key)) {
    throw conflict('用户名已被占用');
  }
  if (store.findOne('users', (u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw conflict('邮箱已被占用');
  }

  const roles = assertRolesAssignable(scope, actor, roleIds, targetTenantId);

  // 席位校验
  if (targetTenantId) {
    const subscription = store.findOne('subscriptions', (s) => s.tenantId === targetTenantId);
    const used = store.filter('users', (u) => u.tenantId === targetTenantId).length;
    if (subscription && used >= subscription.seats) {
      throw conflict(`席位已用满（${used}/${subscription.seats}），请先升级套餐`);
    }
  }

  const user = store.insert('users', {
    id: `usr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    tenantId: targetTenantId,
    username,
    email,
    displayName: displayName || username,
    passwordHash: hashPassword(password || 'Saas@123'),
    phone: phone || '',
    status: 'active',
    isPlatform: targetTenantId === null,
    roleIds: roles.map((r) => r.id),
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  });

  audit.record({
    actor,
    action: 'user.create',
    actionLabel: '新建账号',
    target: user.displayName,
    tenantId: targetTenantId,
  });
  return decorate(user);
}

function update(scope, id, patch, actor) {
  const user = store.findById('users', id);
  if (!user) throw notFound('账号不存在');
  if (!scope.isPlatform && user.tenantId !== scope.tenantId) {
    throw forbidden('不允许修改其他租户的数据');
  }
  if (user.isPlatform && !actor.isPlatform) throw forbidden('不能修改平台账号');

  const allowed = ['displayName', 'phone', 'status', 'email', 'username'];
  const next = {};
  for (const key of allowed) if (patch[key] !== undefined) next[key] = patch[key];

  if (patch.roleIds && patch.roleIds.length) {
    const roles = assertRolesAssignable(scope, actor, patch.roleIds, user.tenantId);
    next.roleIds = roles.map((r) => r.id);
  }

  const updated = store.update('users', id, next);
  audit.record({
    actor,
    action: patch.status ? 'user.update-status' : 'user.update',
    actionLabel: patch.status ? '变更账号状态' : '编辑账号',
    target: updated.displayName,
    tenantId: updated.tenantId,
  });
  return decorate(updated);
}

function remove(scope, id, actor) {
  const user = store.findById('users', id);
  if (!user) throw notFound('账号不存在');
  if (!scope.isPlatform && user.tenantId !== scope.tenantId) {
    throw forbidden('不允许删除其他租户的数据');
  }
  if (user.id === actor.id) throw badRequest('不能删除当前登录账号');
  store.remove('users', id);
  audit.record({
    actor,
    action: 'user.delete',
    actionLabel: '删除账号',
    target: user.displayName,
    tenantId: user.tenantId,
  });
  return { id };
}

function resetPassword(scope, id, actor, newPassword) {
  const user = store.findById('users', id);
  if (!user) throw notFound('账号不存在');
  if (!scope.isPlatform && user.tenantId !== scope.tenantId) {
    throw forbidden('不允许操作其他租户的数据');
  }
  const password = newPassword || 'Saas@123';
  store.update('users', id, { passwordHash: hashPassword(password) });
  audit.record({
    actor,
    action: 'user.reset-password',
    actionLabel: '重置密码',
    target: user.displayName,
    tenantId: user.tenantId,
  });
  return { id, tempPassword: password };
}

module.exports = { list, getById, create, update, remove, resetPassword, decorate };
