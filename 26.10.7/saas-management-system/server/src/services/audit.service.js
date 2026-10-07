'use strict';

const store = require('../db/store');

function record({ actor, action, actionLabel, target, tenantId, ip }) {
  return store.insert('auditLogs', {
    id: `log_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    actorId: actor ? actor.id : null,
    actorName: actor ? actor.displayName : '系统',
    actorEmail: actor ? actor.email : '-',
    tenantId: tenantId || (actor && actor.tenantId) || null,
    tenantName: null,
    action,
    actionLabel: actionLabel || action,
    target: target || '',
    ip: ip || '',
    createdAt: new Date().toISOString(),
  });
}

function list(scope, { page = 1, pageSize = 20, action, keyword } = {}) {
  let items = store.collection('auditLogs').slice();
  if (!scope.isPlatform || scope.tenantId) {
    items = items.filter((l) => l.tenantId === scope.tenantId);
  }
  if (action) items = items.filter((l) => l.action === action);
  if (keyword) {
    const k = keyword.toLowerCase();
    items = items.filter(
      (l) =>
        (l.actorName || '').toLowerCase().includes(k) ||
        (l.target || '').toLowerCase().includes(k) ||
        (l.actionLabel || '').toLowerCase().includes(k)
    );
  }
  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page, pageSize };
}

module.exports = { record, list };
