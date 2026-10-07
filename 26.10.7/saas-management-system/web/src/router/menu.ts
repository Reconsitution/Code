import type { ComponentType } from 'react';
import {
  IconAudit,
  IconBuilding,
  IconDashboard,
  IconReceipt,
  IconShield,
  IconTag,
  IconUsers,
} from '../components/icons';

export interface MenuItem {
  key: string;
  label: string;
  path: string;
  icon: ComponentType;
  /** 命中任意一个权限即显示；为空表示不做权限限制 */
  permAny: string[];
  /** 仅平台侧可见 */
  platformOnly?: boolean;
  group: string;
}

/**
 * 菜单即权限映射表 —— 前端菜单隔离的唯一来源。
 * 后端返回的 permissions 决定这里哪些项渲染出来，
 * 因此租户管理员天然看不到「租户管理」「审计日志」等平台菜单。
 */
export const MENU: MenuItem[] = [
  {
    key: 'dashboard',
    label: '数据概览',
    path: '/dashboard',
    icon: IconDashboard,
    permAny: ['dashboard:platform:view', 'dashboard:tenant:view'],
    group: '概览',
  },
  {
    key: 'tenants',
    label: '租户管理',
    path: '/tenants',
    icon: IconBuilding,
    permAny: ['tenant:view'],
    platformOnly: true,
    group: '平台运营',
  },
  {
    key: 'users',
    label: '账号管理',
    path: '/users',
    icon: IconUsers,
    permAny: ['user:view'],
    group: '账号与权限',
  },
  {
    key: 'roles',
    label: '角色权限',
    path: '/roles',
    icon: IconShield,
    permAny: ['role:view', 'role:manage'],
    group: '账号与权限',
  },
  {
    key: 'plans',
    label: '套餐订阅',
    path: '/plans',
    icon: IconTag,
    permAny: ['plan:view', 'subscription:view'],
    group: '计费',
  },
  {
    key: 'billing',
    label: '计费中心',
    path: '/billing',
    icon: IconReceipt,
    permAny: ['invoice:view'],
    group: '计费',
  },
  {
    key: 'audit',
    label: '审计日志',
    path: '/audit',
    icon: IconAudit,
    permAny: ['audit:view'],
    platformOnly: true,
    group: '系统',
  },
];

export function visibleMenu(permissions: string[], isPlatform: boolean): MenuItem[] {
  return MENU.filter((item) => {
    if (item.platformOnly && !isPlatform) return false;
    if (!item.permAny.length) return true;
    return item.permAny.some((p) => permissions.includes(p));
  });
}

export function findMenu(pathname: string): MenuItem | undefined {
  return MENU.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
}
