'use strict';

const config = require('./config');
const store = require('./db/store');
const createApp = require('./app');

const { seeded } = store.load();
const app = createApp();

app.listen(config.port, config.host, () => {
  const data = store.raw();
  console.log('');
  console.log('  多租户 SaaS 后台 - 服务端已启动');
  console.log(`  地址: http://localhost:${config.port}`);
  console.log(`  数据: ${config.db.file}${seeded ? '（本次已自动播种）' : ''}`);
  console.log('');
  console.log('  租户 8 个 / 账号 ' + data.users.length + ' 个 / 角色 ' + data.roles.length + ' 个');
  console.log('  统一初始密码: ' + config.seed.defaultPassword);
  console.log('');
  console.log('  可用账号:');
  console.log('    admin@platform.local    平台超级管理员（看全部租户）');
  console.log('    ops@platform.local      平台运营只读');
  console.log('    chen.jiawei@acme.com    租户管理员（只能看 Acme 科技）');
  console.log('');
});

process.on('SIGINT', () => {
  store.persistNow();
  process.exit(0);
});
