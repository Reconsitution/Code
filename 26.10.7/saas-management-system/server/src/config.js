'use strict';

const path = require('path');

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';

module.exports = {
  port: PORT,
  host: HOST,
  // 开发环境允许任意来源；生产请在环境变量中显式配置白名单
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwt: {
    secret: process.env.JWT_SECRET || 'saas-admin-dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 8),
  db: {
    // 数据落在 data/db.json；删掉该文件后重启会自动重新播种
    file: process.env.DB_FILE || path.join(__dirname, '..', 'data', 'db.json'),
  },
  seed: {
    defaultPassword: process.env.SEED_PASSWORD || 'Saas@123',
  },
};
