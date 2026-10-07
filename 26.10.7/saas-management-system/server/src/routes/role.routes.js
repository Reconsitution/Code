'use strict';

const express = require('express');
const { ok } = require('../utils/response');
const { authRequired, requirePermission, requireAnyPermission } = require('../middleware/auth');
const { attachScope, guardCrossTenant } = require('../middleware/scope');
const roleService = require('../services/role.service');
const { PERMISSIONS } = require('../domain/permissions');

const router = express.Router();

router.use(authRequired, guardCrossTenant, attachScope);

router.get('/', requireAnyPermission(['role:view', 'role:manage']), (req, res) => {
  return ok(res, roleService.list(req.scope));
});

router.get('/permissions', requireAnyPermission(['role:view', 'role:manage']), (req, res) => {
  return ok(res, { permissions: PERMISSIONS });
});

router.post('/', requirePermission('role:manage'), (req, res) => {
  return ok(res, roleService.create(req.scope, req.body || {}, req.user));
});

router.patch('/:id', requirePermission('role:manage'), (req, res) => {
  return ok(res, roleService.update(req.scope, req.params.id, req.body || {}, req.user));
});

router.delete('/:id', requirePermission('role:manage'), (req, res) => {
  return ok(res, roleService.remove(req.scope, req.params.id, req.user));
});

module.exports = router;
