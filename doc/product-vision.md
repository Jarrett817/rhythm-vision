# Rhythm Vision 产品构思

## 一句话

基于浏览器的音频可视化创作工具：上传或采集音频，实时生成 2D/3D 视觉效果，支持录制导出；可选本地语音识别与动态歌词排版。

## 核心场景

| 场景 | 描述 | 优先级 |
|------|------|--------|
| 音乐可视化 | 根据频谱、节拍、响度驱动 2D/3D 画面 | P0 |
| 效果切换 | 同一音频可切换多种可视化预设 | P0 |
| 录制导出 | 将画布 + 音频合成为视频/WebM | P1 |
| 歌词排版 | 导入 LRC/SRT，按时间轴做动态文字动画 | P1 |
| 实时 ASR | 本地语音识别歌词（离线、低延迟） | P2 |

> **关键分叉**：「已有歌词时间轴的动态排版」与「实时语音识别歌词」是两条技术路线。MVP 优先前者；ASR 作为增强能力在第二阶段引入。

## 系统架构

```
音频输入（文件 / 麦克风）
        │
        ▼
  AudioEngine ──► 特征分析（FFT、RMS、节拍、BPM）
        │                    │
        │                    ├──► 3D 渲染（R3F + Three.js）
        │                    └──► 2D 渲染（PixiJS / Canvas）
        │
        ├──► LyricsTimeline（LRC/SRT 词级时间轴）
        │           │
        │           └──► 歌词动态排版层（DOM / Canvas overlay）
        │
        └──► ExportPipeline（MediaRecorder 录制导出）
```

### 模块职责

| 模块 | 职责 |
|------|------|
| `AudioEngine` | 播放、暂停、seek；Web Audio 分析；麦克风采集 |
| `VisualizerRegistry` | 注册/切换 2D、3D 效果插件，统一接收 `AudioFeatures` |
| `LyricsTimeline` | 解析 LRC/SRT，提供当前时刻歌词与词级时间戳 |
| `ExportPipeline` | `canvas.captureStream()` + `MediaRecorder` 合成音视频 |

### 效果插件契约

每种可视化效果实现统一接口，不各自重复写音频分析：

```ts
interface AudioFeatures {
  frequencyData: Uint8Array;  // 频谱
  waveformData: Uint8Array;   // 波形
  rms: number;                // 响度
  bass: number;               // 低频能量
  mid: number;
  treble: number;
  beat?: boolean;             // 节拍脉冲（可选）
  bpm?: number;
}

interface VisualizerPlugin {
  id: string;
  name: string;
  dimension: '2d' | '3d';
  mount(container: HTMLElement): void;
  unmount(): void;
  update(features: AudioFeatures, delta: number): void;
}
```

## 技术栈

### 已选型

| 层级 | 技术 | 理由 |
|------|------|------|
| 运行时 / 包管理 | Bun | 安装快、脚本统一 |
| 框架 | React 19 + React Router 7（SPA，`ssr: false`） | 多页面路由、懒加载、深链接分享效果 |
| 构建 | Vite 8 | 与 RR 官方模板一致 |
| 样式 | Tailwind CSS 4 | 模板内置，实用优先 |
| 组件库 | shadcn/ui（仅 CLI 安装） | 可定制、无运行时负担 |
| 3D | Three.js + R3F + drei + postprocessing | React 声明式 3D，生态成熟 |
| 2D | PixiJS 8 | WebGL 2D 粒子/图形，性能优于裸 Canvas |
| 音频特征 | Web Audio API + Meyda | 内置分析 + 扩展 MFCC 等特征 |
| 状态 | Zustand | 轻量，跨路由共享播放/效果状态 |

### 待引入（按阶段）

| 能力 | 候选方案 | 阶段 |
|------|----------|------|
| 本地 ASR | `@huggingface/transformers`（Whisper Tiny，Web Worker） | P1（已实现） |
| 高质量录制 | ccapture.js | P1（若 MediaRecorder 不满足） |
| 预设持久化 | IndexedDB | P1 |

## 路由规划

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 产品介绍、上传入口 |
| `/player` | 播放器 | 可视化主界面（全屏画布 + 控制面板） |
| `/editor` | 编辑器 | 歌词排版、效果参数调节 |
| `/export` | 导出 | 录制预览与下载 |

React Router 在单页原型阶段可有可无；当页面 ≥ 2 且需要分享链接时保留。

## MVP 里程碑

### Phase 1 — 可视化核心

- [x] 上传音频文件并播放
- [x] 实时频谱分析，输出 `AudioFeatures`
- [x] 艺术化 3D 效果（落雨梦境 / 落花流转 / 朦胧极光）
- [x] 效果切换与氛围参数面板
- [x] 基础 UI 壳（shadcn Card/Button/Tabs/Slider）

### Phase 2 — 歌词与录制

- [x] 本地 Whisper 实时识别歌词（`@huggingface/transformers` + Web Worker）
- [x] 歌词柔光叠层展示
- [x] `MediaRecorder` 录制画布为 WebM
- [ ] 预设保存到 IndexedDB

### Phase 3 — 本地 ASR

- [ ] 集成 Whisper（transformers.js），模型按需下载
- [ ] 流式识别 + 词级时间戳
- [ ] ASR 结果写入 `LyricsTimeline`，复用排版引擎

## 目录结构（目标）

```
app/
├── components/ui/          # shadcn 组件（仅 CLI 安装）
├── features/
│   ├── audio/              # AudioEngine、分析器
│   ├── visualizers/        # 2D/3D 效果插件
│   ├── lyrics/             # 歌词解析与排版
│   └── export/             # 录制导出
├── routes/                 # React Router 页面
└── lib/                    # 工具函数
doc/
└── product-vision.md       # 本文档
```

## 风险与约束

| 风险 | 缓解 |
|------|------|
| 本地 ASR 模型体积大（~40MB+） | 按需下载、Web Worker 推理、P2 再做 |
| 录制时音视频不同步 | 统一时间轴驱动渲染与录制帧 |
| 3D + 2D 双层渲染性能 | 效果插件独立 mount，录制时才合成 |
| 浏览器兼容性 | 目标 Chrome/Edge 最新版；Safari 录制需单独验证 |

## 非目标（当前版本不做）

- 多用户协作 / 云端同步
- 移动端原生 App
- 在线音乐流媒体接入
- 服务端渲染（已明确 `ssr: false`）
