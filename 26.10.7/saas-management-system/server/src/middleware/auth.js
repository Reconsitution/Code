'use strict';

const store = require('../db/store');
const { verifyToken } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/response');

/**
 * 把数据库里的用户展开成运行时身份：
 *   req.user = { id, tenantId, isPlatform, permissions, roles, ... }
 * permissions 是用户所有角色权限的并集，菜单与按钮的可见性都基于它。
 */
function buildIdentity(user) {
  const roles = store
    .filter('roles', (r) => user.roleIds.includes(r.id))
    .map((r) => ({ id: r.id, code: r.code, name: r.name, isSystem: r.isSystem }));

  const permissionSet = new Set();
  for (const roleId of user.roleIds) {
    const role = store.findById('roles', roleId);
    if (role) for (const p of role.permissions) permissionSet.add(p);
  }

  const tenant = user.tenantId ? store.findById('tenants', user.tenantId) : null;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    tenantId: user.tenantId,
    tenantName: tenant ? tenant.name : '平台',
    tenantSlug: tenant ? tenant.slug : null,
    isPlatform: Boolean(user.isPlatform),
    status: user.status,
    roleIds: user.roleIds.slice(),
    roles,
    permissions: Array.from(permissionSet),
  };
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(unauthorized());

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return next(unauthorized('登录凭证无效或已过期，请重新登录'));
  }

  const user = store.findById('users', payload.sub);
  if (!user) return next(unauthorized('账号不存在'));
  if (user.status !== 'active') return next(forbidden('账号已被停用，请联系管理员'));

  req.user = buildIdentity(user);
  req.rawUser = user;
  return next();
}

/** 权限守卫：用户权限集合必须包含指定权限码 */
function requirePermission(code) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (req.user.permissions.includes(code)) return next();
    return next(forbidden(`缺少权限：${code}`));
  };
}

/** 任一权限满足即可（用于"只读或可写都能进"的页面） */
function requireAnyPermission(codes) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (codes.some((c) => req.user.permissions.includes(c))) return next();
    return next(forbidden(`缺少权限：${codes.join(' / ')}`));
  };
}

/** 平台侧守卫 */
function requirePlatform(req, res, next) {
  if (!req.user) return next(unauthorized());
  if (!req.user.isPlatform) return next(forbidden('该资源仅平台侧可见'));
  return next();
}

module.exports = {
  buildIdentity,
  authRequired,
  requirePermission,
  requireAnyPermission,
  requirePlatform,
};
