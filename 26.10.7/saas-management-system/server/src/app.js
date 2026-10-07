'use strict';

const express = require('express');
const cors = require('cors');
const config = require('./config');
const { errorHandler, notFoundHandler, requestLogger } = require('./middleware/error');

const authRoutes = require('./routes/auth.routes');
const tenantRoutes = require('./routes/tenant.routes');
const userRoutes = require('./routes/user.routes');
const roleRoutes = require('./routes/role.routes');
const planRoutes = require('./routes/plan.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const billingRoutes = require('./routes/billing.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

function createApp() {
  const app = express();
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  // 根路径：这是纯 API 服务，给一个说明页避免浏览器里看到 "Cannot GET /"
  app.get('/', (req, res) => {
    const web = process.env.WEB_ORIGIN || 'http://localhost:5173';
    res.type('html').send(`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>Nimbus 后端服务</title>
<style>body{font-family:"PingFang SC",system-ui,sans-serif;max-width:680px;margin:60px auto;padding:0 20px;color:#14203a;line-height:1.7}
h1{font-size:20px;margin:0 0 6px}code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px}
a{color:#1d4ed8}ul{padding-left:20px}.muted{color:#64748b;font-size:13px}</style></head>
<body>
<h1>Nimbus 云控制台 · 后端服务</h1>
<p class="muted">这是纯 API 服务，没有独立页面。管理界面请访问前端：</p>
<p><a href="${web}">${web}</a></p>
<p class="muted">主要接口：</p>
<ul>
<li><code>POST /api/auth/login</code> 登录</li>
<li><code>GET /api/health</code> 健康检查</li>
<li><code>GET /api/tenants</code> <code>/api/users</code> <code>/api/roles</code> <code>/api/plans</code></li>
<li><code>GET /api/subscriptions</code> <code>/api/billing/overview</code></li>
<li><code>GET /api/dashboard/platform</code> <code>/api/dashboard/tenant</code></li>
</ul>
<p class="muted">所有业务接口需在请求头带上 <code>Authorization: Bearer &lt;token&gt;</code>。</p>
</body></html>`);
  });

  app.get('/api/health', (req, res) => {
    res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/tenants', tenantRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/roles', roleRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // 兜底：把 /api/dashboard/audit-logs 之外未匹配的路径统一 404
  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
