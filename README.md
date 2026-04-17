# Notedown

[![MIT License](https://img.shields.io/badge/license-MIT-0f766e.svg)](LICENSE)
[![CI](https://github.com/FFYFZQ/Notedown/actions/workflows/ci.yml/badge.svg)](https://github.com/FFYFZQ/Notedown/actions/workflows/ci.yml)
[![Obsidian](https://img.shields.io/badge/Obsidian-Desktop%20Only-cb9b00.svg)](https://obsidian.md/)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-1f6feb.svg)](chrome-extension/)

Local-first web clipping for Chrome and Obsidian.

Notedown 是一个轻量的本地摘录工具，由一个 Chrome 扩展和一个 Obsidian 插件组成。你在网页或 PDF 中选中文字，写下问题或想法，内容会直接保存到本地 Vault，对应到一篇 Markdown 文件里。

> Notedown 不是“稍后读”工具，而是一个把阅读过程直接沉淀进个人知识库的本地工作流。

## 一句话介绍

当你在网页、博客、论文或 PDF 里看到一段值得记下来的内容时，不用切屏，不用来回复制，不用先收藏再忘记。选中，写一句自己的想法，保存，内容就直接进入你的 Obsidian。

## 为什么做这个工具

很多人的知识管理，问题不在于“没有记录”，而在于：

- 收藏很多，但回看很少
- 摘录和思考分离，最后只剩一堆引用
- 阅读和记笔记之间来回切换，打断思路
- 网页、PDF、Obsidian 之间的流程太碎

Notedown 想解决的不是“再多一个剪藏箱”，而是把阅读当下的判断、疑问、联想和反驳，一起保存进长期知识库。

## 你最终得到的是什么

- 一条本地优先的摘录链路
- 一份带来源、引用和个人想法的 Markdown 笔记
- 一个更自然的“阅读即整理”过程
- 一个更容易复盘和继续扩写的个人知识库入口

## 60 秒理解工作流

```text
网页 / PDF
  -> 选中一段内容
  -> 点击“记到 Obsidian”
  -> 写下问题、判断或联想
  -> 保存到本地 Vault
  -> 自动归入对应 Markdown 文件
```

## 核心价值

### 1. 让摘录和思考绑定在一起

很多剪藏工具只保存“原文”，但真正有价值的是你当时为什么觉得它重要。

Notedown 会把这两件事放在同一次操作里完成：

- 引用原文
- 记录你的问题 / 想法

### 2. 让阅读不中断

你不需要先切到 Obsidian，再新建笔记，再粘贴链接，再补引用。整个过程留在阅读现场完成，思路不容易断。

### 3. 让个人知识库更容易长出来

真正能形成知识库的，不是“存了多少内容”，而是你是否把输入转成了自己的理解。

Notedown 适合做这种最小动作：

- 记下一个疑问
- 记下一次反驳
- 记下一个和旧笔记的连接
- 记下一条后续要查的线索

## 为什么它适合个人知识库

如果你把 Obsidian 当作长期知识仓库，Notedown 的价值不只是“方便记笔记”，而是它帮助你把知识整理动作提前到了阅读当下：

- 不是读完再总结，而是边读边留下关键判断
- 不是收集资料，而是逐步形成自己的问题链条
- 不是堆收藏，而是沉淀可继续扩写的 Markdown 草稿

长期来看，这种方式更容易形成真正可复用的笔记网络。

## 适合谁

Notedown 适合这些使用场景：

- 你平时用 Obsidian 做知识管理
- 你经常在网页、论文、博客或 PDF 里读东西
- 你不想在浏览器和笔记软件之间频繁切换
- 你希望笔记保存在本地，而不是依赖第三方云服务

如果你的目标是“边读边记，而且最后沉淀成结构化 Markdown”，这个项目就是为这个场景做的。

## 功能特点

- 本地优先：数据只在浏览器和本机 Obsidian 之间传输
- 低打扰：只在你主动摘录时工作，不做轮询
- 网页摘录：选中文本后直接弹出 `记到 Obsidian`
- PDF 支持：扩展会接管常见在线 PDF，并提供可选中文字的自定义阅读页
- 结构清晰：每篇文章或文档对应一个 Markdown 文件
- 安全控制：可选 `Shared Secret`，限制本地接收端访问

## 工作方式

1. 在 Chrome 网页或 PDF 阅读页中选中文字
2. 点击浮动按钮 `记到 Obsidian`，或用快捷键打开采集面板
3. 输入你的问题、想法或注释
4. Chrome 扩展把内容发到本机 `127.0.0.1`
5. Obsidian 插件接收后，在 Vault 中创建或追加 Markdown 文件

## 这个项目不是什么

为了避免预期不一致，这里也说清楚：

- 它不是云同步知识库
- 它不是网页全文离线归档工具
- 它不是 AI 总结器
- 它不是 Obsidian 社区市场里的现成一键安装插件

它更像一个轻量的、本地优先的“阅读到笔记”的桥。

## 两部分分别做什么

### Chrome 扩展

Chrome 扩展负责前端交互：

- 检测你当前选中的网页文本
- 显示浮动按钮、右键菜单和快捷键入口
- 在 PDF 场景下提供自定义阅读页
- 把摘录内容、当前页面标题、链接和你的想法发送给本地接收端

### Obsidian 插件

Obsidian 插件负责本地落盘：

- 在本机启动一个本地 HTTP 服务
- 接收来自浏览器扩展的摘录请求
- 在 Vault 中创建或追加 Markdown 文件
- 统一保存到指定目录，方便你后续整理

这两个部分结合起来，构成一个完全本地的摘录链路。

## 仓库结构

```text
chrome-extension/
  background.js
  content.js
  manifest.json
  options.html
  options.js
  pdf-viewer.css
  pdf-viewer.html
  pdf-viewer.js
  popup.html
  popup.js
  styles.css
  vendor/pdfjs/

notedown-bridge/
  main.js
  manifest.json
```

## 环境要求

- 桌面版 Obsidian `>= 1.5.0`
- Chrome 或兼容 Chromium 的浏览器
- 可访问本地 Vault 的桌面环境

## 安装

### 五分钟快速上手

如果你只想先跑起来，最短路径是：

1. 把 `notedown-bridge/` 复制到 Obsidian Vault 的 `.obsidian/plugins/notedown-bridge/`
2. 在 Obsidian 的“已安装插件”里启用 `Notedown Bridge`
3. 在 Chrome 的 `chrome://extensions` 中加载 `chrome-extension/`
4. 在扩展选项里把 `Server URL` 设为 `http://127.0.0.1:27124`
5. 打开任意网页，选中一段文字，点击 `记到 Obsidian`

如果这五步跑通，后面的设置基本就是增强体验和增强安全性。

## 安装后你能怎么用

最常见的三个场景：

- 读博客时，顺手摘一段并写下自己的判断
- 读论文 PDF 时，把关键定义、结论和疑问直接存进 Obsidian
- 做长期主题研究时，把零散阅读逐步积累成一篇主题笔记

### 1. 安装 Obsidian 插件

把 `notedown-bridge/` 整个目录复制到你的 Vault，并且目录名不要改：

```text
<你的 Vault>/.obsidian/plugins/notedown-bridge/
```

最终目录里应该直接看到这两个文件：

```text
<你的 Vault>/.obsidian/plugins/notedown-bridge/manifest.json
<你的 Vault>/.obsidian/plugins/notedown-bridge/main.js
```

然后在 Obsidian 中：

1. 打开 `设置 -> 第三方插件`
2. 打开 `社区插件`
3. 点击已安装插件列表右上角的刷新按钮，或者重启 Obsidian
4. 在“已安装插件”里启用 `Notedown Bridge`

注意：

- 手动安装的插件不会出现在“浏览 / 社区插件市场搜索”里
- 它只会出现在“已安装插件”列表里
- 插件是桌面版专用，不支持移动端

插件默认监听：

- 地址：`http://127.0.0.1:27124`
- 保存目录：`Web Clippings`

建议在插件设置里配置一个 `Shared Secret`，然后在 Chrome 扩展里保持一致。

### 2. 安装 Chrome 扩展

1. 打开 `chrome://extensions`
2. 打开右上角 `开发者模式`
3. 点击 `加载已解压的扩展程序`
4. 选择仓库里的 `chrome-extension/` 目录
5. 打开扩展 `详细信息 -> 扩展程序选项`
6. 填入：
   - `Server URL`：例如 `http://127.0.0.1:27124`
   - `Shared Secret`：和 Obsidian 插件设置一致

如果要启用 PDF 支持，建议在扩展详情中把 `Site access` 设为 `On all sites`。

## 使用

### 网页内摘录

1. 在网页中选中一段文字
2. 点击浮动按钮 `记到 Obsidian`
3. 输入问题、想法或注释
4. 点击 `保存`

### 快捷键

- Windows / Linux：`Ctrl+Shift+Y`
- macOS：`Command+Shift+Y`

快捷键会在当前标签页打开采集面板，并读取当前选中的文本。

### 右键菜单

选中文字后，可以右键使用 `保存到 Obsidian`。

### PDF 页面

扩展会尝试接管常见在线 PDF，并切换到 Notedown 自己的 PDF 阅读页。

在这个阅读页里：

1. 直接选中文字
2. 页面会出现 `记到 Obsidian`
3. 输入问题 / 想法后保存

目前支持两类常见场景：

- URL 明确以 `.pdf` 结尾
- URL 本身不以 `.pdf` 结尾，但服务器返回 `Content-Type: application/pdf`

例如 arXiv 这类链接也在支持范围内。

### 典型使用流程

一个典型的使用过程大致是这样：

1. 你在网页中看到一段值得记录的内容
2. 选中它
3. 在弹出的面板里写下自己的疑问、判断、反驳或联想
4. 点击保存
5. 回到 Obsidian 时，你会看到对应文章已经生成或追加到同一个 Markdown 文件中

这样做的好处是：

- 原文引用和你的思考天然绑在一起
- 同一篇文章不会被拆成很多零散笔记
- 后续回看时，能同时看到上下文、来源和你的判断

## 为什么不是“先收藏，之后再整理”

因为大多数“之后”都不会发生。

Notedown 的设计假设是：

- 真正重要的内容，应该在你第一次产生反应时就记下来
- 最有价值的不是原文本身，而是你当下的理解
- 个人知识库不是靠批量导入建立的，而是靠持续留下自己的判断建立的

所以它鼓励的是一个很小但持续的动作：

读到有感觉的内容，当场写一句。

## 生成的 Markdown 示例

```md
# 一篇文章标题

- Source: [一篇文章标题](https://example.com/article)
- Created: 2026-04-08T12:00:00.000Z
- Saved by: Notedown

---

## 2026-04-08 20:00:01

> 这里是你在网页中选中的原文
> 会自动按 Markdown 引用块格式保存

### 问题 / 想法

这里是你输入的问题或思考。
```

## 权限说明

Chrome 扩展当前申请这些权限：

- `activeTab`、`contextMenus`、`storage`：基础采集与设置存储
- `webNavigation`、`webRequest`：识别主标签页是否为 PDF，并切换到自定义 PDF 阅读页
- `<all_urls>`：网页摘录和 PDF 接管都需要访问当前页面
- `http://127.0.0.1/*`、`http://localhost/*`：把内容发给本地 Obsidian 插件

这些权限的目的都是本地摘录，不包含远程同步或遥测。

## 隐私与数据

- 不依赖云服务
- 不上传摘录内容到第三方服务器
- 默认只向本机 `127.0.0.1` 发送数据
- 是否设置 `Shared Secret` 由你控制，但强烈建议开启

## 常见问题

### 1. Obsidian 里看不到插件

先检查目录层级是否正确，正确结构应该是：

```text
<Vault>/.obsidian/plugins/notedown-bridge/manifest.json
<Vault>/.obsidian/plugins/notedown-bridge/main.js
```

不要多套一层目录。然后确认：

- 你打开的是正确的 Vault
- 你看的不是“社区市场搜索”，而是“已安装插件”
- Obsidian 已经重启或刷新过插件列表

### 2. Chrome 扩展加载了，但网页里没有按钮

先确认这些点：

- 你在普通网页正文里选中了真实文本
- 当前页面不是 `chrome://`、扩展页或浏览器内部页面
- 页面已经在扩展刷新后重新加载
- 扩展已经开启，并且不是旧版本缓存状态

### 3. PDF 页面不能正常接管

先检查：

- 扩展详情里的 `Site access` 是否设为 `On all sites`
- 当前 PDF 标签页是否在扩展更新后重新打开或刷新
- 当前链接是否真的返回 PDF 内容

当前方案对大多数在线 PDF 有效，但浏览器内部 PDF、某些受限制页面或特殊站点仍可能受限。

### 4. 保存时报连接失败

这通常说明浏览器已经工作了，但 Obsidian 插件没有在监听本地端口。检查：

- `Notedown Bridge` 是否已启用
- 插件端口是否仍是 `27124`
- Chrome 扩展里的 `Server URL` 是否与插件设置一致
- 如果设置了 `Shared Secret`，两边是否完全一致

## 本地开发

这个仓库目前不依赖构建流程，代码可以直接通过“已解压扩展”方式加载。

常用检查命令：

```bash
python3 -m json.tool chrome-extension/manifest.json >/dev/null
node --check chrome-extension/background.js
node --check chrome-extension/content.js
node --check chrome-extension/popup.js
node --experimental-default-type=module --check chrome-extension/pdf-viewer.js
```

## 第三方依赖

PDF 阅读能力基于 vendored `pdfjs-dist`，详细说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 路线图

后续计划见 [ROADMAP.md](ROADMAP.md)。

## 贡献

欢迎 issue、bug report、文档改进和 PR。提交前请先看 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

本项目采用 [MIT License](LICENSE)。
