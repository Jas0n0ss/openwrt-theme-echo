# Code Review — luci-theme-echo v1.5.11

本文档记录对当前代码库的整体审查结论与已处理项。

## 架构总览

| 层级 | 文件 | 职责 |
|------|------|------|
| 模板 | `ucode/template/themes/echo/*.ut` | HTML 骨架、资源引用、UCI 主题变量 |
| 导航 | `menu-echo.js` | L1/L2/L3 菜单、VPN/软件虚拟分组、溢出「更多」 |
| 概览 | `dashboard-echo.js` | Network Map、四表仪表盘、RPC 轮询 |
| 增强 | `ui-echo.js` | 第三方 `.cbi-tabmenu` / 表格 / Modal 适配 |
| 主题 | `theme-echo.js` | localStorage 深浅色三态 |
| 样式 | `htdocs/luci-static/echo/css/*` | 布局、毛玻璃、响应式、OpenWrt 预设 |

数据流：LuCI 加载 `header.ut` → `menu-echo` 读取 `ui.menu` 树并渲染 → 页面内容注入 `#maincontent` → `ui-echo` / `dashboard-echo` 增强。

## 审查结论

### 已通过 / 设计合理

1. **菜单分层** — L2 仅在 `sub-nav` 展示，L3+ 才用 `content-tabs`，避免概览/防火墙/路由重复出现。
2. **虚拟分组** — `_buildTopEntries()` 将 VPN 插件与第三方软件分别归入 `_echo_vpn` / `_echo_apps`，顶栏更整洁。
3. **无重复标题** — `has-sub-nav` 时隐藏 `#echo-header`，符合「导航即标题」。
4. **构建链** — `build-ipk.sh` + `verify-ipk.sh` + GitHub Actions 形成可重复验证的发布流程。
5. **Legacy 检查** — `verify-ipk.sh` 扫描 BE88U/ASUS 残留，防止品牌回退。
6. **响应式** — `layout.css` / `dashboard.css` 在 960px / 640px 断点调整导航与网格。

### 已在本轮修复

| 项 | 处理 |
|----|------|
| `status-echo.js` 已移除加载但仍打入 IPK | 删除源文件，从 `build-ipk.sh` 移除拷贝 |
| README / DESIGN 描述侧栏、状态栏 | 重写 README，更新 DESIGN 布局图 |
| `dist/` 误入版本库 | 加入 `.gitignore`，由 CI 构建 |
| Demo 端口 9080 与文档 8080 不一致 | `serve.sh` 默认改为 8080 |
| `menu-echo.js` VPN 关键词数组缩进错误 | 已格式化 |

### 已知限制 / 后续建议

1. **i18n 与 standalone IPK** — `po/zh_Hans/*.po` 在 OpenWrt 源码编译时由 `luci.mk` 处理；独立 `build-ipk.sh` 暂未打包 `.lmo`，纯 IPK 安装时部分 `_()` 字符串可能仍显示英文，除非 LuCI 运行时从 feed 加载翻译。建议后续在 build 脚本中加入 `msgfmt` 步骤。
2. **LEDE 旧模板** — `luasrc/view/themes/echo/header.htm` 仍为侧栏 + 状态栏布局，与 ucode 版不同步；仅影响 18.06 用户，可择机对齐或标注 deprecated。
3. **VPN 识别规则** — 基于名称 / 图标启发式，新插件若命名特殊可能进「软件」分组，可在 `menu-echo.js` 的 `_isVpnMenu` 中扩展关键词。
4. **单插件分组** — VPN / 软件组内仅 1 个插件时不显示 L2（与系统分区一致），行为符合设计但可在文档中说明。

## 安全与性能

- 无服务端自定义逻辑；主题仅为静态资源 + 客户端 JS。
- `menu-echo` 图标 URL 来自本地 `/luci-static/echo/icons/`，无外部 CDN 依赖。
- Dashboard RPC 轮询 10s / 15s，概览页外不挂载，开销可控。

## 测试清单

- [x] `./scripts/build-ipk.sh` 成功
- [x] `./scripts/verify-ipk.sh` 通过
- [ ] 路由器实机：切换 Echo 主题、VPN/软件分组、概览 Network Map
- [ ] 移动端浏览器：顶栏折行、二级菜单横向滚动

---

*审查日期：2026-05-29 · 版本 1.5.11*
