'use strict';

const config = require('../config');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || '服务器内部错误';

  if (status >= 500) {
    console.error('[error]', err);
  }

  return res.status(status).json({
    success: false,
    code,
    message,
    details: err.details || null,
  });
}

function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `接口不存在：${req.method} ${req.originalUrl}`,
    details: null,
  });
}

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      console.log(`[${req.method}] ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    }
  });
  return next();
}

module.exports = { errorHandler, notFoundHandler, requestLogger, config };
