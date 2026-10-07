'use strict';

const express = require('express');
const { ok } = require('../utils/response');
const { authRequired } = require('../middleware/auth');
const authService = require('../services/auth.service');
const { PERMISSIONS, PERMISSION_CODES } = require('../domain/permissions');
const config = require('../config');
const store = require('../db/store');

const router = express.Router();

const clientIp = (req) => (req.headers['x-forwarded-for'] || req.ip || '').toString();

router.post('/login', (req, res) => {
  const { account, password } = req.body || {};
  const result = authService.login({ account, password, ip: clientIp(req) });
  return ok(res, result);
});

router.get('/me', authRequired, (req, res) => {
  return ok(res, authService.me(req.user));
});

router.post('/change-password', authRequired, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  return ok(res, authService.changePassword(req.user, { oldPassword, newPassword }));
});

router.post('/logout', authRequired, (req, res) => {
  return ok(res, { success: true });
});

/**
 * 演示账号列表（仅非生产环境暴露）。
 * 初始密码由 config.seed.defaultPassword 决定，可能通过环境变量覆盖，
 * 因此这里在运行时返回，保证前端展示的密码永远和实际可用的一致。
 */
router.get('/demo-accounts', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'not found' });
  }
  const users = store.collection('users');
  const candidates = [
    { email: 'admin@platform.local', label: '平台超级管理员', hint: '可管理全部租户、套餐与计费' },
    { email: 'ops@platform.local', label: '平台运营（只读）', hint: '只能查看，不能修改' },
  ];
  const firstTenantAdmin = users.find((u) => !u.isPlatform && u.tenantId);
  if (firstTenantAdmin) {
    candidates.push({
      email: firstTenantAdmin.email,
      label: `租户管理员（${firstTenantAdmin.displayName}）`,
      hint: '只能看到自己租户的数据',
    });
  }
  const accounts = candidates
    .map((c) => {
      const u = users.find((x) => x.email === c.email);
      return u ? { ...c, username: u.username, exists: true } : { ...c, username: '', exists: false };
    })
    .filter((a) => a.exists);

  return ok(res, { accounts, password: config.seed.defaultPassword });
});

/** 权限目录，前端角色编辑页用它渲染勾选框 */
router.get('/permissions', authRequired, (req, res) => {
  const groups = {};
  for (const p of PERMISSIONS) {
    if (!groups[p.module]) groups[p.module] = [];
    groups[p.module].push({ code: p.code, name: p.name, scope: p.scope });
  }
  return ok(res, {
    codes: PERMISSION_CODES,
    groups: Object.keys(groups).map((module) => ({ module, items: groups[module] })),
  });
});

module.exports = router;
