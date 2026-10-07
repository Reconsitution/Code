import { create } from 'zustand';

interface UiState {
  /** 桌面端侧边栏是否收窄为图标 */
  collapsed: boolean;
  /** 移动端抽屉是否打开 */
  drawerOpen: boolean;
  toggleCollapsed: () => void;
  setDrawer: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  collapsed: false,
  drawerOpen: false,
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
  setDrawer: (open) => set({ drawerOpen: open }),
}));
