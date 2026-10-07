'use strict';

const store = require('../db/store');
const { badRequest, notFound, conflict, forbidden } = require('../utils/response');
const { PERMISSION_CODES, isKnownPermission } = require('../domain/permissions');
const audit = require('./audit.service');

function decorate(role) {
  const tenant = role.tenantId ? store.findById('tenants', role.tenantId) : null;
  const userCount = store.filter('users', (u) => u.roleIds.includes(role.id)).length;
  return {
    ...role,
    tenantName: tenant ? tenant.name : '平台内置',
    userCount,
  };
}

/** 平台侧：返回平台内置角色 +（可选）指定租户的角色；租户侧：只返回自己的角色 */
function list(scope) {
  let items;
  if (scope.isPlatform) {
    items = store
      .collection('roles')
      .filter((r) => (scope.tenantId ? r.tenantId === scope.tenantId : true));
  } else {
    items = store.collection('roles').filter((r) => r.tenantId === scope.tenantId);
  }
  return items
    .sort((a, b) => (a.tenantId === null ? -1 : 1) - (b.tenantId === null ? -1 : 1))
    .map(decorate);
}

function catalog() {
  return { permissions: PERMISSION_CODES.length, groups: require('../domain/permissions').PERMISSIONS };
}

/** 只允许授予调用者自己拥有的权限，防止提权 */
function assertNoEscalation(actor, permissions) {
  for (const code of permissions) {
    if (!isKnownPermission(code)) throw badRequest(`未知权限码：${code}`);
  }
  const actorSet = new Set(actor.permissions);
  const isSuperAdmin = actor.permissions.includes('tenant:create');
  if (isSuperAdmin) return;
  for (const code of permissions) {
    if (!actorSet.has(code)) throw forbidden(`不能授予自己不具备的权限：${code}`);
  }
}

function create(scope, payload, actor) {
  const { name, code, description, permissions, tenantId } = payload;
  if (!name || !code) throw badRequest('角色名称与编码不能为空');
  const targetTenantId = scope.isPlatform ? tenantId || null : scope.tenantId;
  if (!scope.isPlatform && tenantId && tenantId !== scope.tenantId) {
    throw forbidden('不能在其它租户下创建角色');
  }
  const exists = store.findOne('roles', (r) => r.code === code && r.tenantId === targetTenantId);
  if (exists) throw conflict('该角色编码已存在');

  const perms = permissions || [];
  assertNoEscalation(actor, perms);

  const role = store.insert('roles', {
    id: `rol_${Date.now().toString(36)}`,
    tenantId: targetTenantId,
    code,
    name,
    description: description || '',
    permissions: perms,
    isSystem: false,
    createdAt: new Date().toISOString(),
  });
  audit.record({
    actor,
    action: 'role.create',
    actionLabel: '新建角色',
    target: role.name,
    tenantId: targetTenantId,
  });
  return decorate(role);
}

function update(scope, id, patch, actor) {
  const role = store.findById('roles', id);
  if (!role) throw notFound('角色不存在');
  if (!scope.isPlatform && role.tenantId !== scope.tenantId) {
    throw forbidden('不允许修改其他租户的角色');
  }
  const next = {};
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.description !== undefined) next.description = patch.description;
  if (patch.permissions !== undefined) {
    assertNoEscalation(actor, patch.permissions);
    next.permissions = patch.permissions;
  }
  const updated = store.update('roles', id, next);
  audit.record({
    actor,
    action: 'role.update',
    actionLabel: '调整角色权限',
    target: updated.name,
    tenantId: updated.tenantId,
  });
  return decorate(updated);
}

function remove(scope, id, actor) {
  const role = store.findById('roles', id);
  if (!role) throw notFound('角色不存在');
  if (role.isSystem) throw badRequest('内置角色不可删除');
  if (!scope.isPlatform && role.tenantId !== scope.tenantId) {
    throw forbidden('不允许删除其他租户的角色');
  }
  const used = store.filter('users', (u) => u.roleIds.includes(id)).length;
  if (used) throw conflict(`该角色下还有 ${used} 个账号，请先改派角色`);
  store.remove('roles', id);
  audit.record({ actor, action: 'role.delete', actionLabel: '删除角色', target: role.name, tenantId: role.tenantId });
  return { id };
}

module.exports = { list, catalog, create, update, remove, decorate };
