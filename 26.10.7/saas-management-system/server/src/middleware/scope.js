'use strict';

const { forbidden } = require('../utils/response');

/**
 * 多租户数据作用域。
 *
 * 隔离策略：共享库 + tenantId 行级过滤（shared schema, row-level scoping）。
 * 平台侧用户可以跨租户查看（tenantId 为空代表"全部"），
 * 租户侧用户被强制锁定在自己的 tenantId 上 —— 即便他手改请求参数也越不过去。
 *
 * service 层所有查询都必须消费这个 scope，这是整个系统数据隔离的唯一入口。
 */
function resolveScope(user, query = {}) {
  if (user.isPlatform) {
    return {
      isPlatform: true,
      tenantId: query.tenantId || null, // null = 不限租户
    };
  }
  return {
    isPlatform: false,
    tenantId: user.tenantId,
  };
}

/**
 * 越权访问拦截：租户侧用户显式传入了不属于自己的 tenantId 时直接 403。
 * 平台侧不做限制。
 */
function guardCrossTenant(req, res, next) {
  const requested = req.query.tenantId || (req.body && req.body.tenantId);
  if (!requested) return next();
  if (req.user.isPlatform) return next();
  if (requested !== req.user.tenantId) {
    return next(forbidden('不允许访问其他租户的数据'));
  }
  return next();
}

/** 把 scope 挂到 req 上，供 service 使用 */
function attachScope(req, res, next) {
  req.scope = resolveScope(req.user, req.query || {});
  return next();
}

/** 判断一条带 tenantId 的记录是否落在当前作用域内 */
function inScope(scope, record) {
  if (scope.isPlatform && !scope.tenantId) return true;
  return record.tenantId === scope.tenantId;
}

/** 对数组做作用域过滤 */
function scopedList(scope, list) {
  return list.filter((item) => inScope(scope, item));
}

module.exports = { resolveScope, guardCrossTenant, attachScope, inScope, scopedList };
