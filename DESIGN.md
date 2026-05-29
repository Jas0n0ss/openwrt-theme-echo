# Echo Theme — 设计规范

## 设计理念

**Echo** 融合两类高端路由器 UI 的优点：

| 来源 | 借鉴元素 |
|------|----------|
| **Apple 路由器 / AirPort** | 极简留白、系统字体、圆角卡片、毛玻璃顶栏、精致阴影、流畅动效 |
| **OpenWrt Dashboard** | 深色侧边导航、顶部状态 Pill、General/Advanced 分组、信息密度更高的仪表盘 |

目标：在 LuCI 全功能前提下，提供接近消费级高端路由器的视觉与交互体验。

---

## 视觉语言

### 色彩

```
浅色模式
├── 背景      #F5F5F7  (Apple 系统灰)
├── 卡片      #FFFFFF
├── 主文字    #1D1D1F
├── 次要文字  #6E6E73
├── 主色      #0071E3  (Apple Blue)
├── OpenWrt青 #00B5E2  (Dashboard 预设)
└── 强调色    #00B5E2  (型号标签)

深色模式
├── 背景      #000000 / #1C1C1E
├── 卡片      #2C2C2E
├── 主色      #0A84FF
└── 侧边栏    #0C1524 → #152238 渐变
```

###  typography

- 主字体：`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif`
- 等宽：`SF Mono, Menlo, monospace`
- 基准字号：14px

### 圆角与阴影

- 小控件：8px
- 卡片：16px
- 登录框：20px
- 阴影：Apple 风格多层 soft shadow + 1px 描边

### 动效

- 缓动：`cubic-bezier(0.25, 0.1, 0.25, 1)`
- 页面切换：180ms 淡出 + 2px 位移
- Tab 滑块：250ms 宽/位移动画

---

## 技术分层（v1.6.0 — Bootstrap 底座）

| 层 | 来源 | 作用 |
|----|------|------|
| **CBI / 表单 / 表格** | `luci-theme-bootstrap` → `cascade.css` | LuCI 标准组件，第三方 app 兼容 |
| **兼容桥** | `bootstrap-compat.css` | CSS 变量映射、`#modemenu` 隐藏、下拉防泄漏 |
| **菜单逻辑** | `menu-bootstrap-core.js` | 与 `menu-bootstrap.js` 一致的 URL / 激活 / 排序 / L3 tabs |
| **Echo 壳层** | `layout.css` + `menu-echo.js` | 顶栏、图标、点击下拉 L2、Network Map |
| **Echo 皮肤** | `glass.css` / `openwrt.css` / UCI 配色 | Apple × OpenWrt 视觉 |

依赖：`LUCI_DEPENDS:=+luci-theme-bootstrap`

## 布局架构（v1.6.0）

```
┌──────────────────────────────────────────────────────────────┐
│ Brand     L1▼ 状态 系统 服务 网络 统计 …插件 退出    [主题]   │
│              └ 点击展开 L2 下拉（非横向条）                   │
├──────────────────────────────────────────────────────────────┤
│ L3: #content-tabs（与 bootstrap tabmenu 同深度规则）          │
├──────────────────────────────────────────────────────────────┤
│ Main — Network Map、仪表盘表格、LuCI CBI（bootstrap 样式）    │
├──────────────────────────────────────────────────────────────┤
│ Footer — Echo 版本 · OpenWrt 版本                             │
└──────────────────────────────────────────────────────────────┘
```

> 旧版 LEDE 模板（`luasrc/`）仍为侧栏布局，与 ucode 版不同。

### 响应式

- **<960px**：顶栏折行，主菜单图标优先，二级菜单横向滚动
- **<640px**：Network Map 两列网格，表格卡片化
- 触控目标 ≥ 44px（导航按钮、二级菜单项）

---

## 布局架构（历史参考 · 已废弃侧栏方案）

```
┌─────────────────────────────────────────────────────────┐
│ Sidebar (248px)  │  Status Bar (WAN/LAN/WiFi/Clients)   │
│ ───────────────  ├─────────────────────────────────────┤
│ Hostname         │  Header: Title + Theme + Logout       │
│ Echo Router      ├─────────────────────────────────────┤
│                  │  Top Tabs (Status/System/Network...)  │
│ Nav Items        ├─────────────────────────────────────┤
│  └ Sub items     │  Sub Tabs (optional)                  │
│                  ├─────────────────────────────────────┤
│ Echo v1.0.0      │  Main Content (CBI forms, tables)     │
│                  ├─────────────────────────────────────┤
│                  │  Footer                               │
└─────────────────────────────────────────────────────────┘
```

### 响应式 (<960px)

- 侧边栏抽屉式滑出
- 状态栏横向滚动
- 表单字段垂直堆叠

---

## 组件规范

### 状态 Pill（华硕风格）

顶部实时显示 WAN / LAN / WiFi / 客户端数量，绿点=在线，红点=离线，橙点=未知。

### 侧边栏（华硕深色 + Apple 图标）

- 深蓝渐变背景
- 线性 SVG 图标 18×18
- 激活项：左侧 3px 蓝色指示条 + 半透明高亮
- 子菜单：滑动高亮块

### CBI 表单（Apple 风格）

- 白色卡片包裹 section
- 输入框 focus 时蓝色 ring
- 主按钮 `#0071E3` 实心
- 危险操作为 outline 红色

### 登录页

- 居中卡片，径向渐变背景
- Logo 使用 Echo 层叠图标
- 全宽登录按钮

---

## 兼容性策略

| 分支/目录 | 目标系统 | 模板引擎 |
|-----------|----------|----------|
| `master` (默认) | OpenWrt 22.03+, 23.05+, 24.x, ImmortalWrt | ucode `.ut` |
| `lede` 或 `luasrc/` | LEDE 18.06, Lean 固件 | Lua `.htm` |

安装后通过 **系统 → 外观** 或 UCI 切换：

```bash
uci set luci.main.mediaurlbase='/luci-static/echo'
uci set luci.main.lang='auto'
uci commit luci
/etc/init.d/uhttpd restart
```

---

## 文件结构

```
luci-theme-echo/
├── Makefile
├── DESIGN.md
├── README.md
├── htdocs/luci-static/echo/css/    # 样式系统
├── htdocs/luci-static/resources/     # menu-echo.js, status-echo.js
├── ucode/template/themes/echo/       # 现代 LuCI 模板
├── luasrc/view/themes/echo/          # LEDE 兼容模板
└── root/etc/uci-defaults/            # 首次安装注册主题
```

---

## 后续扩展建议

1. **luci-app-echo-config** — 自定义主色、背景图、状态栏开关
2. **Dashboard 小部件** — Overview 页注入 echo-card 网格（CPU、内存、流量）
3. **i18n** — 补充 zh_CN 文案
4. **PWA** — manifest + 离线图标（参考 Aurora 主题）
