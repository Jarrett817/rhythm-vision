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

## shadcn 组件

仅通过 CLI 安装，勿手写组件：

```bash
bunx shadcn@latest add <component>
```
