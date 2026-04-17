# Notedown

Local-first web clipping for Chrome and Obsidian.

Notedown 是一个轻量的本地摘录工具，由一个 Chrome 扩展和一个 Obsidian 插件组成。你在网页或 PDF 中选中文字，写下问题或想法，内容会直接保存到本地 Vault，对应到一篇 Markdown 文件里。

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
