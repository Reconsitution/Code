'use strict';

const express = require('express');
const { ok, badRequest } = require('../utils/response');
const { authRequired, requirePermission, requireAnyPermission } = require('../middleware/auth');
const { attachScope, guardCrossTenant } = require('../middleware/scope');
const tenantService = require('../services/tenant.service');

const router = express.Router();

router.use(authRequired, guardCrossTenant, attachScope);

const pageParams = (req) => ({
  page: Number(req.query.page || 1),
  pageSize: Number(req.query.pageSize || 10),
  keyword: req.query.keyword || '',
  status: req.query.status || '',
  planId: req.query.planId || '',
});

// 注意：静态路径必须写在 /:id 之前
router.get('/summary', requirePermission('tenant:view'), (req, res) => {
  return ok(res, tenantService.summary());
});

router.get(
  '/me',
  requireAnyPermission(['dashboard:tenant:view', 'subscription:view']),
  (req, res) => {
    if (!req.user.tenantId) return ok(res, null);
    return ok(res, tenantService.getById(req.scope, req.user.tenantId));
  }
);

router.get(
  '/',
  requireAnyPermission(['tenant:view', 'dashboard:tenant:view']),
  (req, res) => {
    return ok(res, tenantService.list(req.scope, pageParams(req)));
  }
);

router.get('/:id', requireAnyPermission(['tenant:view', 'dashboard:tenant:view']), (req, res) => {
  return ok(res, tenantService.getById(req.scope, req.params.id));
});

router.post('/', requirePermission('tenant:create'), (req, res) => {
  return ok(res, tenantService.create(req.body || {}, req.user));
});

router.patch('/:id', requirePermission('tenant:update'), (req, res) => {
  return ok(res, tenantService.update(req.scope, req.params.id, req.body || {}, req.user));
});

router.post('/:id/status', requirePermission('tenant:suspend'), (req, res) => {
  const { status } = req.body || {};
  if (!status) throw badRequest('缺少 status 字段');
  return ok(res, tenantService.setStatus(req.scope, req.params.id, status, req.user));
});

module.exports = router;
