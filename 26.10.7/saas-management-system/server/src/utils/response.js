'use strict';

class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (message, details) => new ApiError(400, 'BAD_REQUEST', message, details);
const unauthorized = (message = '未登录或登录已失效') => new ApiError(401, 'UNAUTHORIZED', message);
const forbidden = (message = '没有执行该操作的权限') => new ApiError(403, 'FORBIDDEN', message);
const notFound = (message = '资源不存在') => new ApiError(404, 'NOT_FOUND', message);
const conflict = (message, details) => new ApiError(409, 'CONFLICT', message, details);

function ok(res, data, meta) {
  return res.json({ success: true, data, meta: meta || null });
}

function fail(res, status, code, message, details) {
  return res.status(status).json({ success: false, code, message, details: details || null });
}

module.exports = { ApiError, badRequest, unauthorized, forbidden, notFound, conflict, ok, fail };
