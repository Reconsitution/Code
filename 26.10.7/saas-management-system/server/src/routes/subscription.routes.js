'use strict';

const express = require('express');
const { ok, badRequest } = require('../utils/response');
const { authRequired, requirePermission, requireAnyPermission } = require('../middleware/auth');
const { attachScope, guardCrossTenant } = require('../middleware/scope');
const subscriptionService = require('../services/subscription.service');

const router = express.Router();

router.use(authRequired, guardCrossTenant, attachScope);

router.get('/', requireAnyPermission(['subscription:view']), (req, res) => {
  return ok(
    res,
    subscriptionService.list(req.scope, {
      keyword: req.query.keyword || '',
      status: req.query.status || '',
      planId: req.query.planId || '',
    })
  );
});

router.post('/change-plan', requirePermission('subscription:manage'), (req, res) => {
  const { tenantId, planId, billingCycle } = req.body || {};
  if (!tenantId || !planId) throw badRequest('缺少 tenantId 或 planId');
  return ok(res, subscriptionService.changePlan(req.scope, tenantId, planId, req.user, billingCycle));
});

router.post('/:id/auto-renew', requirePermission('subscription:manage'), (req, res) => {
  return ok(res, subscriptionService.toggleAutoRenew(req.scope, req.params.id, req.user));
});

router.post('/:id/cancel', requirePermission('subscription:manage'), (req, res) => {
  return ok(res, subscriptionService.cancel(req.scope, req.params.id, req.user));
});

module.exports = router;
