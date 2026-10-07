'use strict';

const express = require('express');
const { ok } = require('../utils/response');
const { authRequired, requirePermission, requireAnyPermission } = require('../middleware/auth');
const { attachScope, guardCrossTenant } = require('../middleware/scope');
const billingService = require('../services/billing.service');

const router = express.Router();

router.use(authRequired, guardCrossTenant, attachScope);

router.get('/overview', requireAnyPermission(['invoice:view', 'subscription:view']), (req, res) => {
  return ok(res, billingService.overview(req.scope));
});

router.get('/invoices', requireAnyPermission(['invoice:view']), (req, res) => {
  return ok(
    res,
    billingService.listInvoices(req.scope, {
      page: Number(req.query.page || 1),
      pageSize: Number(req.query.pageSize || 10),
      status: req.query.status || '',
      tenantId: req.query.tenantId || '',
    })
  );
});

module.exports = router;
