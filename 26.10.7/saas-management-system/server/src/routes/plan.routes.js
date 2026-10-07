'use strict';

const express = require('express');
const { ok } = require('../utils/response');
const { authRequired, requirePermission, requireAnyPermission } = require('../middleware/auth');
const { attachScope } = require('../middleware/scope');
const planService = require('../services/plan.service');

const router = express.Router();

router.use(authRequired, attachScope);

router.get('/', requireAnyPermission(['plan:view', 'subscription:view']), (req, res) => {
  return ok(res, planService.list());
});

router.get('/:id', requireAnyPermission(['plan:view', 'subscription:view']), (req, res) => {
  return ok(res, planService.getById(req.params.id));
});

router.post('/', requirePermission('plan:manage'), (req, res) => {
  return ok(res, planService.create(req.body || {}, req.user));
});

router.patch('/:id', requirePermission('plan:manage'), (req, res) => {
  return ok(res, planService.update(req.params.id, req.body || {}, req.user));
});

module.exports = router;
