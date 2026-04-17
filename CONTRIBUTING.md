# Contributing

感谢你愿意改进 Notedown。

## 适合贡献的内容

- bug 修复
- PDF 兼容性改进
- 文档补充和安装指引优化
- Obsidian 插件体验改进
- 扩展 UI 和交互细节优化

## 提交建议

1. 先用 issue 描述问题或改进方向
2. 修改尽量聚焦，不要把无关改动混在同一个 PR
3. 如果改了用户可见行为，请同步更新 README
4. 如果改了权限、PDF 接管逻辑或本地接口，请说明原因和风险

## 本地检查

提交前至少跑一遍：

```bash
python3 -m json.tool chrome-extension/manifest.json >/dev/null
node --check chrome-extension/background.js
node --check chrome-extension/content.js
node --check chrome-extension/popup.js
node --experimental-default-type=module --check chrome-extension/pdf-viewer.js
```

## Pull Request 说明

建议在 PR 描述里包含：

- 修改动机
- 主要改动
- 手工验证步骤
- 已知限制或后续工作
