# 保存到 Get笔记

一个无依赖的 Chrome Manifest V3 扩展：在浏览文章时，将当前页面的标题和 URL 保存到 Get笔记，并可选择直接归档到某个知识库。

这是一个我自己正在日常使用的 Get笔记 Chrome 插件。做它的初衷是减少复制链接、切换应用和重复说明知识库的操作，让收藏文章这件事更简单。

## 功能

- 读取当前活动标签页的标题和 URL
- 调用 Get笔记 `link` 类型笔记接口，由服务端抓取和解析文章
- 读取自己创建的可写知识库，并通过 `topic_id` 直接归档
- 记住上次选择的知识库
- 通过弹窗右上角的设置入口配置 API 凭据
- API Key 和 Client ID 仅保存在 `chrome.storage.local`

## 安装

1. 打开 Chrome，进入 `chrome://extensions/`。
2. 开启右上角的「开发者模式」。
3. 点击「加载已解压的扩展程序」。
4. 选择本项目根目录。
5. 建议将扩展固定到 Chrome 工具栏。

## 配置与使用

1. 在 [Get笔记开放平台](https://www.biji.com/openapi?tab=keys) 创建应用，保存 `API Key` 和 `Client ID`。
2. 应用至少需要 `note.content.write` 和 `topic.read` 权限；要归档到知识库时，还需要 `note.topic.write`。
3. 打开扩展，点击右上角设置图标，填入两项凭据。
4. 选择一个知识库，或保持「全部笔记」。
5. 点击「保存到 Get笔记」。

> 普通网页链接由 Get笔记异步解析。扩展显示「已提交解析」时，表示 API 已接收任务，笔记稍后会出现。

## 开发检查

```bash
npm test
npm run check
```

项目不依赖 npm 包，只需 Node.js 20 或更高版本。

## 隐私与权限

- `activeTab`：只在用户打开扩展时读取当前页面的标题和 URL。
- `storage`：在本机保存 API 凭据和上次选择的知识库。
- `https://openapi.biji.com/*`：调用 Get笔记官方 OpenAPI。

扩展不会读取网页正文，不包含分析、遥测或其他第三方请求。

## 一起完善

目前这个插件优先满足简单、高频的个人使用场景。如果你也在使用 Get笔记，有类似需求、功能建议或遇到了问题，欢迎提出 Issue。

也欢迎大家提交 Pull Request，一起把它变得更好用。
