# Nimbus 云控制台 · 多租户 SaaS 后台管理系统

一套可运行的全栈示例：面向多租户 SaaS 产品的**平台运营端 + 租户自服务端**双视角管理后台。

覆盖模块：**登录与 RBAC 权限控制**（平台管理员 / 租户管理员，菜单与数据双重隔离）、**租户与账号管理**、**订阅套餐与计费概览**、**系统数据概览仪表盘**。

---

## 一、快速开始

### 1. 安装依赖

```bash
cd saas-admin
npm run install:all          # 依次安装根目录、server、web 三处依赖
```

### 2. 启动（一条命令同时起前后端）

```bash
npm run dev
```

- 前端：<http://localhost:5173>
- 后端：<http://localhost:4000>
- 前端所有请求走相对路径 `/api`，由 Vite 代理到后端，无需配置 CORS 或端口

### 3. 登录

启动后端时，控制台会打印**当次生效的初始密码**。也可以直接看登录页——页面会自动拉取演示账号并预填密码。

| 账号                     | 角色             | 能看到什么                                    |
| ---------------------- | -------------- | ---------------------------------------- |
| `admin@platform.local` | 平台超级管理员        | 全部菜单：租户、账号、角色、套餐、计费、审计                   |
| `ops@platform.local`   | 平台运营（只读）       | 只能查看，所有写操作按钮消失                           |
| `chen.jiawei@acme.com` | 租户管理员（Acme 科技） | 只剩「概览 / 账号 / 角色 / 套餐 / 计费」，且数据全部限定在 Acme |

> **建议的体验路径**：先用平台管理员登录看全局，退出后用租户管理员登录，对比菜单条数与数据范围的差异。

### 4. 重置数据

```bash
npm run reset     # 删除 data/db.json 并重新播种
```

---

## 二、技术选型

| 层     | 选型                          | 理由                                                  |
| ----- | --------------------------- | --------------------------------------------------- |
| 前端框架  | React 18 + TypeScript       | 生态最大、类型友好；TS 让前后端的实体定义可以一一对应                        |
| 构建    | Vite 5                      | 冷启动快，代理配置简单                                         |
| 路由    | React Router v6             | 声明式嵌套路由，天然匹配「Layout + Outlet」的后台布局                  |
| 状态管理  | Zustand                     | 相比 Redux 样板代码少一个数量级；自带 `persist` 中间件，刷新后登录态恢复只需一行配置 |
| 图表    | 手写 SVG / CSS                | 只用到折线、柱状、环形、进度条四种，引入 ECharts 会增加 300KB+ 体积，收益不成正比   |
| 样式    | 原生 CSS + 设计令牌               | 无额外依赖，响应式完全可控                                       |
| 后端运行时 | Node.js + Express 4         | 同步代码路径，异常直接抛出由 Express 捕获，省掉层层 async/await          |
| 鉴权    | JWT（jsonwebtoken）+ bcryptjs | bcryptjs 是纯 JS 实现，避免 Windows 上 node-gyp 编译失败        |
| 数据层   | 内存对象 + JSON 文件持久化           | **零原生依赖，保证开箱即跑**（详见「取舍」章节）                          |

---

## 三、目录结构

```
saas-admin/
├── package.json                  # 根：一条命令并行启动前后端（concurrently）
├── README.md
├── scripts/
│   ├── smoke-server.sh           # 后端接口冒烟测试（14 项，含越权拦截用例）
│   └── smoke-web.sh              # 前端页面 + 代理链路冒烟
│
├── server/                       # ---------------- 后端 ----------------
│   ├── data/db.json              # 运行时数据文件（已在 .gitignore 中忽略）
│   └── src/
│       ├── index.js              # 启动入口：加载数据 → 创建 app → 监听端口
│       ├── app.js                # 组装中间件与路由
│       ├── config.js             # 端口 / JWT 密钥 / 数据文件路径（均可环境变量覆盖）
│       ├── db/
│       │   ├── store.js          # ★ 数据访问层：唯一的文件读写出口
│       │   └── seed.js           # 种子数据（固定随机种子，结果可复现）
│       ├── domain/
│       │   └── permissions.js    # ★ 权限目录 + 内置角色模板（全系统唯一权限源）
│       ├── middleware/
│       │   ├── auth.js           # JWT 校验 → 展开 req.user（含权限并集）
│       │   ├── scope.js          # ★ 多租户数据作用域：越权拦截 + 作用域过滤
│       │   └── error.js          # 统一错误响应
│       ├── services/             # 业务逻辑层（路由保持"薄"）
│       │   ├── auth.service.js
│       │   ├── tenant.service.js
│       │   ├── user.service.js
│       │   ├── role.service.js
│       │   ├── plan.service.js
│       │   ├── subscription.service.js
│       │   ├── billing.service.js     # MRR / ARR / ARPU / 流失率
│       │   ├── dashboard.service.js   # 平台视图 与 租户视图
│       │   └── audit.service.js
│       └── routes/               # 接口层：只做参数接收 + 权限声明 + 调用 service
│           ├── auth.routes.js  tenant.routes.js  user.routes.js
│           ├── role.routes.js  plan.routes.js    subscription.routes.js
│           └── billing.routes.js  dashboard.routes.js
│
└── web/                          # ---------------- 前端 ----------------
    ├── index.html
    ├── vite.config.ts            # /api 代理到 4000
    └── src/
        ├── main.tsx              # 挂载 + BrowserRouter
        ├── App.tsx               # ★ 路由表 + RequireAuth / Guard 双层守卫
        ├── types/index.ts        # 与后端实体一一对应的类型定义
        ├── api/
        │   ├── client.ts         # fetch 封装：token 注入、401 广播、错误归一化
        │   └── index.ts          # 按领域分组的接口函数
        ├── stores/
        │   ├── authStore.ts      # ★ 登录态 / 权限集合 / persist 持久化
        │   └── uiStore.ts        # 侧边栏折叠、移动端抽屉
        ├── hooks/useRequest.ts   # 服务端状态钩子 + useMediaQuery
        ├── router/menu.ts        # ★ 菜单 = 权限映射表（菜单隔离的唯一来源）
        ├── components/
        │   ├── Layout.tsx        # 侧边栏 + 顶栏 + Outlet，响应式骨架
        │   ├── ui.tsx            # Card / StatCard / Badge / Modal / Pager / Tabs…
        │   ├── charts.tsx        # LineChart / BarChart / DonutChart / ProgressBar
        │   └── icons.tsx         # 内联 SVG 图标（无图标库依赖）
        ├── pages/                # 每个业务模块一个文件
        │   ├── Login.tsx  Dashboard.tsx  Tenants.tsx  TenantDetail.tsx
        │   ├── Users.tsx  Roles.tsx  Plans.tsx  Billing.tsx
        │   └── AuditLogs.tsx  Profile.tsx  Misc.tsx(403/404)
        ├── utils/format.ts       # 金额 / 日期 / 状态文案映射
        └── styles/app.css        # 设计令牌 + 布局 + 响应式
```

---

## 四、关键数据模型

### 4.1 实体关系

```
┌──────────┐         ┌──────────┐         ┌────────┐
│  Tenant  │ 1 ─── N │   User   │ N ── M  │  Role  │
│  租户     │         │   账号    │         │  角色   │
└────┬─────┘         └──────────┘         └───┬────┘
     │                                         │
     │ 1                                       │ N
     │                                         │ 持有
     │ 1                                  ┌────▼─────────┐
     ▼                                    │  Permission  │
┌──────────────┐    N ────────── 1        │  权限码(枚举)  │
│ Subscription │                          └──────────────┘
│   订阅        │────────────────────┐
└──────┬───────┘                     │
       │ 1                           │ N ── 1
       │                             ▼
       │ N                      ┌─────────┐
       ▼                        │  Plan   │
┌──────────────┐                │  套餐    │
│   Invoice    │                └─────────┘
│   账单        │
└──────────────┘

旁挂实体：
  UsageRecord（用量）── N:1 ── Tenant
  AuditLog（审计日志）── N:1 ── Tenant + User
```

### 4.2 实体字段

| 实体               | 关键字段                                                                                                                        | 说明                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Tenant**       | `id, name, slug, industry, status(active/suspended), planId, contact*, createdAt`                                           | 租户。`slug` 全局唯一，作为登录域标识                          |
| **User**         | `id, tenantId(可为空), username, email, passwordHash, status, isPlatform, roleIds[], lastLoginAt`                              | **`tenantId === null` 即平台侧用户**，这是区分双视角的唯一开关     |
| **Role**         | `id, tenantId(可为空), code, name, permissions[], isSystem`                                                                    | `tenantId === null` 表示平台内置角色模板或平台角色；系统角色不可删除    |
| **Permission**   | `code, name, module, scope(platform/tenant/both)`                                                                           | 20 个权限码，定义在 `domain/permissions.js`，是前后端共用的唯一来源 |
| **Plan**         | `id, code, name, priceMonthly, priceYearly, seats, features[]`                                                              | 套餐。年价 = 月价 × 10（买 10 送 2）                       |
| **Subscription** | `tenantId, planId, status(active/trialing/past_due/canceled), billingCycle, seats, unitAmount, currentPeriodEnd, autoRenew` | 一个租户一条订阅                                        |
| **Invoice**      | `tenantId, subscriptionId, number, amount, status(paid/open/free), periodLabel, paidAt`                                     | 账单流水                                            |
| **UsageRecord**  | `tenantId, date, apiCalls, activeUsers, storageGb`                                                                          | 近 30 天用量，供仪表盘趋势图使用                              |
| **AuditLog**     | `actorId, tenantId, action, target, ip, createdAt`                                                                          | 关键操作留痕                                          |

### 4.3 多租户隔离策略

采用 **共享库 + `tenantId` 行级过滤（shared schema, row-level scoping）**。

隔离的实现集中在 `server/src/middleware/scope.js`，只有两个出口：

```js
resolveScope(user, query)  // 平台用户：tenantId 可空(=全部)；租户用户：强制锁定自己的 tenantId
guardCrossTenant(req, ...) // 租户用户显式传他人 tenantId → 直接 403
```

service 层的所有查询都必须消费 `req.scope`，**这是整个系统数据隔离的唯一入口**。因此：

- 租户管理员手改 URL 里的 `tenantId` → 403
- 租户管理员直接请求他人租户详情 → 403
- 平台管理员不受限，但所有操作进审计日志

---

## 五、权限模型（RBAC）

### 5.1 权限码设计

按 **`模块:动作`** 命名，共 20 个，分 6 个模块组：

```
仪表盘    dashboard:tenant:view / dashboard:platform:view
租户管理  tenant:view / tenant:create / tenant:update / tenant:suspend
账号管理  user:view / user:create / user:update / user:delete / user:reset-password
角色权限  role:view / role:manage
套餐订阅  plan:view / plan:manage / subscription:view / subscription:manage
计费中心  invoice:view / invoice:manage
系统      audit:view
```

每个权限码带一个 `scope`：

- `platform` —— 只有平台侧角色能持有（`tenant:*`、`plan:manage`、`audit:view`）
- `tenant` —— 只有租户侧角色能持有（`dashboard:tenant:view`）
- `both` —— 两边都可持有（`user:*`、`role:*`、`invoice:view`…）

### 5.2 内置角色

| 角色                        | 归属     | 权限数    | 说明           |
| ------------------------- | ------ | ------ | ------------ |
| 平台超级管理员 `platform_admin`  | 平台     | 20（全量） | 管理所有租户、套餐、计费 |
| 平台运营只读 `platform_support` | 平台     | 7      | 只能查看，写操作全部没有 |
| 租户管理员 `tenant_admin`      | 各租户各一份 | 11     | 管理本租户账号与角色   |
| 租户普通成员 `tenant_member`    | 各租户各一份 | 4      | 只读           |

新建租户时，系统会自动为它**实例化**租户管理员/普通成员两个角色，并开通一条订阅记录。

### 5.3 三层防护（避免"菜单藏了但直接输 URL 还能进"）

```
第 1 层  菜单渲染      router/menu.ts：按 permissions 过滤 MENU
第 2 层  路由守卫      App.tsx：<Guard permAny={[...]} platformOnly>
第 3 层  接口校验      routes/*：requirePermission('xxx') + guardCrossTenant
```

三层用的是**同一套权限码**。前端隐藏只是体验优化，真正的兜底在服务端。

### 5.4 防提权

`role.service.assertNoEscalation()` 与 `user.service.assertRolesAssignable()` 保证：

> **任何人都不能授予自己不具备的权限。**

例如租户管理员自己没有 `tenant:create`，他新建角色时，涉及租户管理的权限勾选框会置灰并禁用；即便绕过前端直接调接口，服务端也会抛 403。

---

## 六、路由与状态管理方案

### 6.1 路由结构

```
/login                    公开
/403                      无权限落地页
/                         需登录 → Layout（侧边栏 + 顶栏 + Outlet）
  ├─ /dashboard           概览（平台/租户两套视图，同一路由按身份分支）
  ├─ /tenants             租户列表        [tenant:view, 仅平台]
  ├─ /tenants/:id         租户详情        [tenant:view, 仅平台]
  ├─ /users               账号管理        [user:view]
  ├─ /roles               角色权限        [role:view | role:manage]
  ├─ /plans               套餐订阅        [plan:view | subscription:view]
  ├─ /billing             计费中心        [invoice:view]
  ├─ /audit               审计日志        [audit:view, 仅平台]
  └─ /profile             个人中心        所有登录用户
*                         404
```

两个守卫组件：

- `RequireAuth` —— 未登录跳 `/login`
- `Guard` —— 权限不足跳 `/403`，`platformOnly` 的路由租户用户直接拦掉

### 6.2 状态管理

只用了 **两个 store**，职责严格分开：

**`authStore`（Zustand + persist）**

```ts
{ token, user, status: 'idle' | 'loading' | 'authed' | 'anon' }
+ login() / logout() / refresh()
+ hasPermission(code) / hasAnyPermission(codes)
```

- `persist` 中间件把 `token` 和 `user` 写进 localStorage，刷新页面自动恢复
- 应用启动时 `status === 'idle'` → 自动 `refresh()` 用 token 换回最新用户信息（权限可能被改过）
- 任意接口返回 401 时，`api/client.ts` 广播 `UNAUTHORIZED_EVENT`，store 监听后统一登出

**`uiStore`** —— 只放 UI 态：`collapsed`（桌面折叠）、`drawerOpen`（移动抽屉）。

**服务端状态**没有引入 react-query，而是用 `hooks/useRequest.ts`（约 40 行）处理 loading / error / reload。

> 这是个明确取舍：目前页面都是「进页面拉一次、操作后 reload」的简单模式，用不上缓存失效、乐观更新。若后续需要，可以平滑替换成 `@tanstack/react-query`，`useRequest` 的调用签名与它基本一致。

### 6.3 菜单即权限映射

`router/menu.ts` 里的 `MENU` 数组同时被三处消费：

1. 侧边栏渲染
2. 顶栏面包屑
3. 路由守卫（保持同一套 `permAny`）

**新增一个模块只需要改这一个地方**，不会出现菜单和路由不一致的情况。

---

## 七、各模块实现要点

| 模块       | 实现要点                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **登录**   | JWT 存 payload `{ sub, tenantId, isPlatform }`；登录成功后返回 `user.permissions` 全量权限数组，前端一次性拿到、避免反复查；失败统一返回「账号或密码不正确」，不区分账号是否存在（防账号枚举） |
| **权限控制** | 登录后权限数组进 store；`<Guard>` 与菜单共用 `permAny`；按钮级控制用 `hasPermission('user:create')` 决定是否渲染，而不是禁用                                     |
| **租户管理** | 列表支持关键词 / 状态 / 套餐筛选；新建时**自动初始化内置角色 + 订阅**；停用租户不改变订阅状态，只拦截访问                                                                     |
| **账号管理** | 平台侧可跨租户建账号（选归属租户）；租户侧强制归属自己。**创建时校验席位上限**，超出抛明确错误；重置密码返回临时密码                                                                    |
| **角色权限** | 权限按模块分组渲染成勾选框；内置角色只读；自定义角色可编辑/删除（有账号占用时拒绝删除）                                                                                    |
| **订阅套餐** | 套餐卡片 + 订阅列表两个 Tab；变更套餐时**校验目标席位 ≥ 当前账号数**，否则拒绝；年付/月付可切换；支持开关自动续费、取消订阅                                                           |
| **计费概览** | MRR 计算把年付金额 ÷ 12 归一到「月」；ARR = MRR × 12；ARPU = MRR / 有效订阅数；流失率 = 已取消 / 总数；近 6 个月实收按 `paidAt` 归集                                  |
| **数据概览** | 平台视图：租户数、MRR、ARPU、待收款 + 12 个月增长折线 + 套餐分布环形 + 实收柱状 + MRR Top 租户 + 最近日志<br />租户视图：席位使用率、本月金额、下次计费日 + API 调用趋势 + 角色分布 + 最近账单       |
| **审计日志** | 所有写操作在 service 层调用 `audit.record()`，不依赖路由层，保证任何入口都被记录                                                                           |


## 九、响应式适配

| 断点         | 表现                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------- |
| ≥ 1025px   | 侧边栏固定展开（240px），可手动收窄为 72px 图标栏                                                              |
| 769–1024px | 登录页隐藏左侧品牌区，单栏展示                                                                             |
| ≤ 768px    | 侧边栏变为抽屉（顶栏汉堡按钮唤出 + 遮罩），点击菜单项自动关闭；**表格转为卡片列表**（`td::before` 取 `data-label` 显示列名）；用户姓名等次要信息隐藏 |
| ≤ 480px    | 统计数字字号下调，登录页内边距收紧                                                                           |

图表全部使用 `width: 100%` + `viewBox`，随容器自适应；柱状图用 flex 平分宽度，不会出现横向溢出。

---

## 十、默认假设

以下是为了「开箱即跑」而做的**显式假设**，接入真实业务时需要逐条替换：

1. **数据持久化用 JSON 文件**，不是数据库。假设这是演示/原型场景。见下方取舍说明。
2. **JWT 密钥用默认值** `saas-admin-dev-secret-change-me`，生产必须通过 `JWT_SECRET` 环境变量覆盖。
3. **密码哈希轮数 8**（bcrypt），生产建议 ≥ 12。
4. **初始密码由 `config.seed.defaultPassword` 决定**，可用 `SEED_PASSWORD` 环境变量覆盖；登录页会实时拉取展示，不会和文档脱节。
5. **没有接入真实支付网关**，账单数据是种子生成的，标记「已支付」不触发任何资金动作。
6. **用量数据（API 调用量等）是模拟的**，没有埋点采集链路。
7. **未实现找回密码 / 邮箱验证 / 二次验证（MFA）**，只有「重置密码返回临时密码」这一条兜底路径。
8. **审计日志只记录不告警**，没有接入风控规则。
9. **租户自助注册未实现**，租户由平台侧创建。
10. **币种固定 CNY**，没有多币种与税率处理。

---

## 十一、关键取舍

### 取舍 1：数据层用 JSON 文件，而不是 SQLite / Prisma

**选择**：内存对象 + JSON 文件持久化（约 100 行）。

**理由**：保证零原生依赖、开箱即跑。`better-sqlite3` 在 Windows 上需要 node-gyp 与 Visual Studio 构建工具，一旦环境缺失整个项目就跑不起来；`node:sqlite` 在 Node 22 仍是实验特性需要加 flag。

**代价**：不支持并发写、没有事务、数据量大了性能会下降。

**换回真实数据库只需改一个文件**：`server/src/db/store.js` 向上只暴露 `collection / insert / update / remove / findById / findOne / filter` 七个语义，service 与 route 完全不用动。

### 取舍 2：状态管理用 Zustand，而不是 Redux Toolkit

**选择**：Zustand。

**理由**：后台系统的全局状态其实只有「登录态 + UI 态」两类，Redux 的 action/reducer 样板在这个体量下收益为负。Zustand 自带 `persist` 中间件，刷新恢复登录态只多一行配置。

**代价**：缺少时间旅行调试等能力。

### 取舍 3：不引入 react-query，自己写 `useRequest`

**选择**：40 行的 `useRequest`。

**理由**：当前所有页面都是「进入时拉一次，写操作后 reload」的简单模式，用不到缓存失效、乐观更新、请求去重。

**代价**：没有缓存，切换页面会重复请求；后续如果需要，替换成 `@tanstack/react-query` 的成本很低（调用签名基本一致）。

### 取舍 4：图表手写 SVG / CSS，不引入 ECharts

**选择**：自研 4 个图表组件，约 150 行。

**理由**：ECharts 压缩后 300KB+，而仪表盘只需要折线、柱状、环形、进度条四种最基础的图形。

**代价**：没有 tooltip、缩放、动画等交互。

### 取舍 5：多租户用共享库 + 行级过滤，而不是「一租户一库」

**选择**：shared schema, row-level scoping。

**理由**：租户数量在几百量级时，共享库的运维复杂度远低于分库；迁移、统计、跨租户查询都简单很多。

**代价**：隔离性依赖代码正确性，出 bug 就是数据泄露。因此把作用域逻辑收敛到 `middleware/scope.js` 一个文件，并写了专门的越权测试用例。**若面向金融、医疗等强合规场景，应改为独立 schema 或独立库。**

### 取舍 6：菜单与路由共用一份权限配置

**选择**：`router/menu.ts` 是唯一来源。

**理由**：避免「菜单改了路由没改」这类最常见的权限漏洞。

**代价**：菜单配置里需要写 `permAny` 数组，比纯静态菜单稍繁琐。

---

## 十二、验证情况

```bash
bash scripts/smoke-server.sh    # 后端 14 项
bash scripts/smoke-web.sh       # 前端页面 + 代理
```

后端冒烟覆盖：健康检查、登录（平台/租户）、**租户只见自己 1 条数据**、**越权访问他人租户返回 403**、**传 tenantId 越权返回 403**、**只读账号建租户返回 403**、平台/租户两套概览、计费指标、套餐角色订阅、审计日志。

前端冒烟覆盖：页面 HTML 返回、入口模块编译通过（HTTP 200）、Vite 代理连通后端、SPA 路由回退正常。

`npx tsc --noEmit` 零错误，`vite build` 产物 240KB（gzip 75KB）。

---

## 十三、后续演进路线

按优先级排序：

1. **换真实数据库**（改 `db/store.js` 一个文件）→ PostgreSQL + Prisma
2. **刷新令牌机制** —— 现在 JWT 固定 8 小时，应改为 access token 短时效 + refresh token 静默续期
3. **操作确认与撤销** —— 删除、停用等高危操作目前只有 `window.confirm`
4. **邀请流程** —— 现在只能管理员代建账号，应支持邮件邀请链接
5. **用量埋点与配额告警** —— 用量数据目前是模拟的
6. **租户自助注册与试用转付费** —— 打通真实支付
7. **单元测试** —— service 层是纯函数式逻辑，最容易补测试，收益也最大
