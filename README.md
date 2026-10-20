# 灵感库 · PromptVault

> 一个**完全本地、离线可用、手机优先**的提示词与灵感图片库。
> 双击就能用，不用注册、不用联网、数据只存在你自己的设备里。

![版本](https://img.shields.io/badge/version-1.0.3-7b6bff) ![PWA](https://img.shields.io/badge/PWA-ready-b76bff) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## 在线直接用（免安装）

**https://andrewbaird3259-boop.github.io/promptvault/**

- 手机 Chrome / Safari 打开 → 菜单里「添加到主屏幕 / 安装应用」，就是一个独立窗口的 App
- 走 https，Service Worker 能注册，**断网也能用**（数据和离线缓存都在你手机上，不上传服务器）
- 源码在 [GitHub](https://github.com/andrewbaird3259-boop/promptvault)，随时可以 fork 成自己的

---

## 它解决什么问题

提示词散落在微信收藏、备忘录、聊天记录里，用到时找不到；好不容易找到，又要在对话框里一段段改 `年龄/场景/风格` 这些占位符。

**灵感库**把这两件事做顺：

- 提示词和参考图放在同一个地方，分类 + 标签 + 搜索，两步之内找到；
- 复制时自动识别 `{{变量}}`，弹出表单让你填，**边填边预览**，填完一键复制成品；
- 图片自动压缩成 WebP（实测 168 KB → 24 KB），手机空间不吃紧；
- 全部数据留在本机，**不联网、不上传、不需要账号**；
- 图片可以挂到生成它的那条提示词上，点开图就能一键复用当时的提示词；
- 返回键先关弹窗再退出，深色模式下状态栏跟着变。

---

## 快速开始

### 方式一：直接双击（最快，零依赖）

打开 `index.html` 即可使用。

> 说明：以 `file://` 方式打开时，浏览器会禁用 IndexedDB，图片会退化成存进 localStorage（可用，但容量约 5 MB）。想要完整能力，用方式二或三。

### 方式二：本地起服务（推荐，手机也能用）

双击 **`start.cmd`**。

窗口里会打印两个地址：

```
电脑：   http://localhost:8080/
手机：   http://192.168.1.23:8080/   （手机与电脑需在同一 WiFi）
```

手机连同一个 WiFi，把第二个地址输入 Chrome 打开即可。

- 想换端口：`start.cmd -Port 8081` 或 `powershell -ExecutionPolicy Bypass -File start.ps1 -Port 8081`
- 不想自动开浏览器：`start.cmd -NoOpen`
- 有 Python 的话也可以：`python -m http.server 8080`

### 方式三：挂到网上（真·安装成 App）

PWA 只有在 **HTTPS** 或 localhost 下才能"安装"。免费托管方案：

| 平台 | 步骤 |
| --- | --- |
| **GitHub Pages** | 把本目录推到一个仓库 → Settings → Pages → Source 选 `GitHub Actions`（仓库里已带 `.github/workflows/pages.yml`）→ 等 1 分钟拿到网址 |
| **Netlify / Vercel** | 把整个文件夹拖进网页即可，无需配置 |
| **Cloudflare Pages** | 连仓库，构建命令留空，输出目录填 `/` |

拿到 https 网址后，安卓 Chrome 会弹出「安装应用」，桌面 Chrome/Edge 地址栏右侧会出现安装图标。

---

## 装到安卓手机上

1. 手机 Chrome 打开你的应用地址（方式二或三）；
2. 右上角 `⋮` → **添加到主屏幕** / **安装应用**；
3. 图标出现在桌面，点开是全屏独立窗口，没有浏览器地址栏；**断网也能用**。

想要一个真正的 `.apk` 安装包：

**本项目已经自带一个**：`dist/PromptVault-1.0.3.apk`（241 KB，v1+v2+v3 签名，minSdk 21 / targetSdk 33）。
它是把 `index.html + assets/` 整个打进 APK 里的 WebView 壳，**装完就是离线可用**，
不依赖任何网址，也不需要 Service Worker —— 发给别人直接安装即可。
源码在 `../promptvault-android/`，重新打包：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\promptvault-android\build-apk.ps1 -SdkRoot C:\androidsdk
```

> 首次安装需要在手机上允许「安装未知来源应用」。签名密钥在 `promptvault-android/keystore/promptvault.jks`，
> **务必保留**：以后发版本必须用同一个密钥，否则老用户无法覆盖升级。

其他三条路（都需要 https 网址）：

- **[PWABuilder](https://www.pwabuilder.com/)**（最省事）：填入你的 https 网址 → Package for Android → 下载签名好的 APK/AAB；
- **Bubblewrap CLI**（`npm i -g @bubblewrap/cli`）：`bubblewrap init --manifest <你的manifest地址>` → `bubblewrap build`。需要 Android SDK；
- 用 **Capacitor** 包一层，适合后续接原生能力。

> 本项目刻意做成纯静态零依赖，所以以上几条路都不需要改代码。

---

## 功能

**提示词**
- 新建 / 编辑 / 删除 / 收藏，标题 + 内容 + 分类 + 标签
- 分类是**自由填写**的（带历史补全），示例数据里已有 AI 绘画 / 办公 / 电商 / 营销 / 写作 / 编程
- 搜索会同时匹配标题、正文、分类、标签
- 四种排序：最近修改 / 最近创建 / 最常使用 / 按名称
- 网格 / 列表两种布局

**变量填充（核心）**
- 用 `{{变量名}}` 写占位符，例如：`一位{{年龄}}岁的{{性别}}，站在{{场景}}`
- 点「复制」时自动弹表单，逐个填写，**下方实时预览替换结果**
- 没填的变量会原样保留，方便你自己手动补
- 卡片上会标出「N 个变量」并按使用次数排序

**图片库**
- 点击 / 拖拽 / `Ctrl+V` 粘贴三种方式添加
- 自动压缩为 WebP（长边 1800），并提供 620px 缩略图，列表不卡
- 瀑布流布局（手机 2 列，桌面最多 5 列）
- 灯箱查看，显示尺寸与压缩前后体积，支持下载 / 系统分享 / 编辑标题标签 / 删除

**其他**
- 深色 / 浅色 / 跟随系统
- 导入导出 JSON 全量备份（提示词 + 设置 + 图片）
- 键盘快捷键：`Ctrl+K` 聚焦搜索、`Ctrl+N` 新建、`Esc` 关闭弹层
- PWA 离线缓存，装机后可无网使用
- 删除有「撤销」，误删能救回来

**1.0.3 新增**
- 左上角菜单：手机上改成**侧边抽屉**，里面是导航 + 新建/加图/导入/导出四个快捷操作 + 分类 + 标签
- 新建按钮（＋）移到**屏幕正中**下方，不再压住卡片按钮
- 手机列表模式重排：标题独占一行，正文预览 + 复制 + 「⋯」更多菜单
- 卡片「⋯」菜单：查看全文 / 复制 / 分享给朋友 / 编辑 / 收藏 / 删除
- **变量记忆**：填过的值会记住，下次打开自动带入，可一键清空
- **分享单条提示词**：走系统分享（微信/QQ/短信），没有分享能力时自动复制文本
- 图片 ↔ 提示词双向关联：灯箱里能挂一条提示词，详情页能看到这条提示词生成的图
- 搜索支持多关键词（空格分隔，全部命中）
- 删除可撤销；设置页新增「清除变量记忆」与「关于」

---

## 数据在哪

| 内容 | 位置 |
| --- | --- |
| 提示词、设置 | 浏览器 `localStorage`（键名 `pv.*`） |
| 图片二进制 | `IndexedDB` → 数据库 `promptvault` |
| 兜底 | IndexedDB 不可用时自动退回 `localStorage` |

**换电脑 / 换浏览器**：设置页 → 导出备份，把 JSON 拷过去 → 导入备份。
**清空数据**：设置页 → 清空全部数据。

> 数据不会离开设备。应用没有任何后端、埋点或第三方请求。

---

## 自定义

| 想改什么 | 改哪里 |
| --- | --- |
| 内置的 12 条示例提示词 | `assets/app.js` 里的 `SEED` 常量 |
| 内置示例图片 | 重新生成 `assets/samples.js`（结构见文件头注释） |
| 主题色 | `assets/styles.css` 顶部的 `--accent` / `--accent-2` |
| 应用名 / 图标 | `manifest.webmanifest` + `assets/icon-*.png`（可用根目录的 `genicon.py` 重画） |
| 预置分类 | `assets/app.js` 里 `SEED` 各条的 `cat` 字段（分类本身是自由文本，历史值会自动补全） |

---

## 目录结构

```
promptvault/
├── index.html              # 单页骨架
├── manifest.webmanifest    # PWA 清单（图标、快捷方式、 standalone）
├── sw.js                   # Service Worker（离线缓存）
├── assets/
│   ├── styles.css          # 全部样式 + 深浅主题 + 响应式断点
│   ├── app.js              # 全部逻辑（IIFE，无构建）
│   ├── samples.js          # 内置示例图（base64 WebP）
│   ├── icon.svg / icon-192.png / icon-512.png / icon-maskable-512.png
├── start.cmd               # Windows 双击启动
├── start.ps1               # 零依赖静态服务器（TcpListener）
├── genicon.py              # 图标生成脚本（需 Pillow）
└── .github/workflows/pages.yml
```

---

## 常见问题

**Q：手机上打不开电脑的地址？**
A：确认在同一个 WiFi；Windows 防火墙弹窗要点「允许访问」；公司网络常禁用设备互访，可以改用手机热点让电脑连上。

**Q：粘贴图片没反应？**
A：`Ctrl+V` 需要页面处于焦点状态（先点一下页面空白处）。手机上没有粘贴键，用「+」按钮选图。

**Q：图片存了但没压缩？**
A：只有新添加的图片会压缩，已经存进去的不会二次处理。

**Q：卸载了浏览器数据会丢吗？**
A：会。清理浏览器数据 = 删掉本应用的全部内容，请定期导出备份。

---

## License

MIT —— 随意使用、修改、分发。
