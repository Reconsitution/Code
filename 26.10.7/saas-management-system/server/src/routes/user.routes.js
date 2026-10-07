'use strict';

const express = require('express');
const { ok, badRequest } = require('../utils/response');
const { authRequired, requirePermission, requireAnyPermission } = require('../middleware/auth');
const { attachScope, guardCrossTenant } = require('../middleware/scope');
const userService = require('../services/user.service');

const router = express.Router();

router.use(authRequired, guardCrossTenant, attachScope);

router.get('/', requireAnyPermission(['user:view']), (req, res) => {
  return ok(
    res,
    userService.list(req.scope, {
      page: Number(req.query.page || 1),
      pageSize: Number(req.query.pageSize || 10),
      keyword: req.query.keyword || '',
      status: req.query.status || '',
      roleId: req.query.roleId || '',
      tenantId: req.query.tenantId || '',
    })
  );
});

router.get('/:id', requirePermission('user:view'), (req, res) => {
  return ok(res, userService.getById(req.scope, req.params.id));
});

router.post('/', requirePermission('user:create'), (req, res) => {
  return ok(res, userService.create(req.scope, req.body || {}, req.user));
});

router.patch('/:id', requirePermission('user:update'), (req, res) => {
  return ok(res, userService.update(req.scope, req.params.id, req.body || {}, req.user));
});

router.delete('/:id', requirePermission('user:delete'), (req, res) => {
  return ok(res, userService.remove(req.scope, req.params.id, req.user));
});

router.post('/:id/reset-password', requirePermission('user:reset-password'), (req, res) => {
  const { password } = req.body || {};
  if (password && password.length < 6) throw badRequest('密码至少 6 位');
  return ok(res, userService.resetPassword(req.scope, req.params.id, req.user, password));
});

module.exports = router;
