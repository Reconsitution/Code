'use strict';

/**
 * 权限目录 —— 全系统唯一的权限码来源。
 * scope: platform 表示只有平台侧角色能持有；tenant 表示租户侧角色可持有；both 表示两边都可以。
 */
const PERMISSIONS = [
  { code: 'dashboard:tenant:view', name: '查看租户概览', module: '仪表盘', scope: 'tenant' },
  { code: 'dashboard:platform:view', name: '查看平台总览', module: '仪表盘', scope: 'platform' },

  { code: 'tenant:view', name: '查看租户列表', module: '租户管理', scope: 'platform' },
  { code: 'tenant:create', name: '新建租户', module: '租户管理', scope: 'platform' },
  { code: 'tenant:update', name: '编辑租户资料', module: '租户管理', scope: 'platform' },
  { code: 'tenant:suspend', name: '停用 / 启用租户', module: '租户管理', scope: 'platform' },

  { code: 'user:view', name: '查看账号', module: '账号管理', scope: 'both' },
  { code: 'user:create', name: '新建账号', module: '账号管理', scope: 'both' },
  { code: 'user:update', name: '编辑账号', module: '账号管理', scope: 'both' },
  { code: 'user:delete', name: '删除账号', module: '账号管理', scope: 'both' },
  { code: 'user:reset-password', name: '重置密码', module: '账号管理', scope: 'both' },

  { code: 'role:view', name: '查看角色', module: '角色权限', scope: 'both' },
  { code: 'role:manage', name: '管理角色与权限', module: '角色权限', scope: 'both' },

  { code: 'plan:view', name: '查看套餐', module: '套餐订阅', scope: 'both' },
  { code: 'plan:manage', name: '管理套餐', module: '套餐订阅', scope: 'platform' },

  { code: 'subscription:view', name: '查看订阅', module: '套餐订阅', scope: 'both' },
  { code: 'subscription:manage', name: '变更 / 续订订阅', module: '套餐订阅', scope: 'platform' },

  { code: 'invoice:view', name: '查看账单', module: '计费中心', scope: 'both' },
  { code: 'invoice:manage', name: '管理账单', module: '计费中心', scope: 'platform' },

  { code: 'audit:view', name: '查看审计日志', module: '审计日志', scope: 'platform' },
];

const PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

/** 内置角色模板。tenantId 为空表示平台侧内置角色。 */
const BUILTIN_ROLES = [
  {
    code: 'platform_admin',
    name: '平台超级管理员',
    description: '拥有平台全部权限，可管理所有租户',
    tenantId: null,
    isSystem: true,
    permissions: PERMISSION_CODES.slice(),
  },
  {
    code: 'platform_support',
    name: '平台运营只读',
    description: '可查看租户、订阅与账单，但不能修改',
    tenantId: null,
    isSystem: true,
    permissions: [
      'dashboard:platform:view',
      'tenant:view',
      'user:view',
      'plan:view',
      'subscription:view',
      'invoice:view',
      'audit:view',
    ],
  },
  {
    code: 'tenant_admin',
    name: '租户管理员',
    description: '管理本租户内的账号、角色与订阅信息',
    tenantId: null, // 模板；实例化时会替换为具体租户 ID
    isSystem: true,
    permissions: [
      'dashboard:tenant:view',
      'user:view',
      'user:create',
      'user:update',
      'user:delete',
      'user:reset-password',
      'role:view',
      'role:manage',
      'plan:view',
      'subscription:view',
      'invoice:view',
    ],
  },
  {
    code: 'tenant_member',
    name: '租户普通成员',
    description: '仅查看本租户概览与账号，无管理权限',
    tenantId: null,
    isSystem: true,
    permissions: ['dashboard:tenant:view', 'user:view', 'plan:view', 'subscription:view'],
  },
];

function isKnownPermission(code) {
  return PERMISSION_CODES.includes(code);
}

function getPermissionMap() {
  const map = {};
  for (const p of PERMISSIONS) map[p.code] = p;
  return map;
}

module.exports = {
  PERMISSIONS,
  PERMISSION_CODES,
  BUILTIN_ROLES,
  isKnownPermission,
  getPermissionMap,
};
