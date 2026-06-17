# Rhythm Vision

浏览器端音频可视化创作工具。详见 [doc/product-vision.md](./doc/product-vision.md)。

## 技术栈

- **Bun** — 包管理
- **React Router 7** — SPA（`ssr: false`）
- **Tailwind CSS 4** + **shadcn/ui**
- **Three.js / R3F** — 3D 可视化
- **PixiJS** — 2D 可视化
- **Meyda** — 音频特征提取

## 开发

```bash
bun install
bun run dev
```

## 构建

```bash
bun run build
bun run typecheck
```

## 部署（GitHub Pages）

1. 仓库 **Settings → Pages → Build and deployment** 选 **GitHub Actions**
2. 推送到 `main` 分支后自动构建部署
3. 访问地址：`https://<username>.github.io/<repo-name>/`

本地模拟 Pages 路径：

```bash
VITE_BASE_PATH=/rhythm-vision/ bun run build
```

## 移动端

纯浏览器 SPA，支持 iOS Safari / Android Chrome。注意：

- 首次播放需用户手势（点击播放按钮）才能启动 `AudioContext`
- 本地音乐库使用 localforage（IndexedDB），移动端同样持久化
- Carousel 支持触摸滑动切歌

## shadcn 组件

仅通过 CLI 安装，勿手写组件：

```bash
bunx shadcn@latest add <component>
```
