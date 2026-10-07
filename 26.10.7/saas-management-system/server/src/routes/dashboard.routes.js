'use strict';

const express = require('express');
const { ok } = require('../utils/response');
const { authRequired, requirePermission } = require('../middleware/auth');
const { attachScope } = require('../middleware/scope');
const dashboardService = require('../services/dashboard.service');
const auditService = require('../services/audit.service');

const router = express.Router();

router.use(authRequired, attachScope);

/** 平台总览 */
router.get('/platform', requirePermission('dashboard:platform:view'), (req, res) => {
  return ok(res, dashboardService.platform(req.scope));
});

/** 租户概览 */
router.get('/tenant', requirePermission('dashboard:tenant:view'), (req, res) => {
  if (!req.user.tenantId) {
    // 平台用户没有自己的租户，返回平台视角
    return ok(res, dashboardService.platform(req.scope));
  }
  return ok(res, dashboardService.tenant(req.scope));
});

/** 审计日志 */
router.get('/audit-logs', requirePermission('audit:view'), (req, res) => {
  return ok(
    res,
    auditService.list(req.scope, {
      page: Number(req.query.page || 1),
      pageSize: Number(req.query.pageSize || 20),
      action: req.query.action || '',
      keyword: req.query.keyword || '',
    })
  );
});

module.exports = router;
