# Notion Cover Generator

动态生成 Notion 页面封面的 Node.js 服务。支持自定义图标、文本、背景颜色和背景图片。

## 功能特点

- 支持使用 Iconify API 的各种图标集
- 自定义文本内容和字体颜色
- 多种背景选项：纯色、渐变色、图案和图片
- 背景图片支持 Picsum Photos 随机图片服务
- 垂直和水平居中的布局
- 可单独指定图标颜色

## 部署

### Vercel 部署

1. Fork 或克隆此仓库
2. 连接到 Vercel 账户
3. 如需使用 Pixabay API，在 Vercel 项目设置中添加环境变量 `PIXABAY_API_KEY`
4. 部署完成后即可使用

### 本地运行

```bash
# 安装依赖
npm install

# 启动服务
npm start
```

## 使用方法

访问 `/info` 路径查看完整的帮助页面和可视化配置界面。

### API 参数

| 参数 | 说明 | 示例 |
|------|------|------|
| iconprefix | 图标集前缀 | mdi, bi, tabler |
| iconname | 图标名称 | camera, book, note |
| content | 显示的文本内容 | 我的笔记 |
| bgcolor | 背景颜色 (支持多色逗号分隔) | #4F46E5 或 #FF5252,#FF7B7B |
| textcolor | 文字颜色 (支持多色逗号分隔) | #FFFFFF |
| iconcolor | 图标颜色 (可选) | #FF0000 |
| iconsize | 图标尺寸 | 100 |
| pattern | 图案背景类型 | grid, dots, diagonal, waves, hexagons |
| bgservice | 背景图服务 | picsum, pixabay, pexels |
| bg | 背景图关键词 | nature, office |
| bgid | Picsum 图片 ID | 237 |

### 示例 URL

```
https://your-app.vercel.app/?iconprefix=mdi&iconname=camera&content=摄影笔记&bgcolor=%234F46E5
```

## 许可证

MIT