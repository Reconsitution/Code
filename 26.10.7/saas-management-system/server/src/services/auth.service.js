'use strict';

const store = require('../db/store');
const { signToken } = require('../utils/jwt');
const { comparePassword, hashPassword } = require('../utils/password');
const { badRequest, unauthorized, notFound } = require('../utils/response');
const { buildIdentity } = require('../middleware/auth');
const audit = require('./audit.service');

function login({ account, password, ip }) {
  const key = String(account || '').trim().toLowerCase();
  const user = store.findOne(
    'users',
    (u) => u.username.toLowerCase() === key || u.email.toLowerCase() === key
  );
  if (!user) throw unauthorized('账号或密码不正确');

  if (!comparePassword(password, user.passwordHash)) {
    throw unauthorized('账号或密码不正确');
  }
  if (user.status !== 'active') {
    throw unauthorized('账号已被停用，请联系管理员');
  }

  store.update('users', user.id, { lastLoginAt: new Date().toISOString() });
  audit.record({
    actor: user,
    action: 'auth.login',
    actionLabel: '登录系统',
    target: user.displayName,
    tenantId: user.tenantId,
    ip,
  });

  const identity = buildIdentity(user);
  const token = signToken({ sub: user.id, tenantId: user.tenantId, isPlatform: Boolean(user.isPlatform) });
  return { token, user: identity };
}

function me(user) {
  const fresh = store.findById('users', user.id);
  if (!fresh) throw notFound('账号不存在');
  return buildIdentity(fresh);
}

function changePassword(user, { oldPassword, newPassword }) {
  const record = store.findById('users', user.id);
  if (!record) throw notFound('账号不存在');
  if (!comparePassword(oldPassword, record.passwordHash)) {
    throw badRequest('原密码不正确');
  }
  if (!newPassword || newPassword.length < 6) {
    throw badRequest('新密码至少 6 位');
  }
  store.update('users', user.id, { passwordHash: hashPassword(newPassword) });
  audit.record({
    actor: record,
    action: 'user.change-password',
    actionLabel: '修改密码',
    target: record.displayName,
    tenantId: record.tenantId,
  });
  return { success: true };
}

module.exports = { login, me, changePassword };
