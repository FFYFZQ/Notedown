# Releasing

## 本地发布检查

1. 确认 README、LICENSE、第三方依赖声明是最新的
2. 确认 `chrome-extension/manifest.json` 和 `notedown-bridge/manifest.json` 版本号正确
3. 运行基础检查：

```bash
python3 -m json.tool chrome-extension/manifest.json >/dev/null
node --check chrome-extension/background.js
node --check chrome-extension/content.js
node --check chrome-extension/popup.js
node --experimental-default-type=module --check chrome-extension/pdf-viewer.js
```

## 发布到 GitHub

如果本地已经有 GitHub 凭据：

```bash
git init
git add .
git commit -m "Initial open-source release"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## 可选：打 Tag

```bash
git tag v0.1.0
git push origin v0.1.0
```

## 可选：创建 GitHub Release

- 上传源码压缩包
- 在 release notes 里说明：
  - 当前支持的安装方式
  - PDF 支持范围
  - 已知限制
