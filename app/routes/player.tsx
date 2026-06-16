import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Route } from "./+types/player";
import { useAudioEngine } from "~/features/audio/use-audio-engine";
import { useLiveTranscription } from "~/features/lyrics/use-live-transcription";
import { useRecorder } from "~/features/export/use-recorder";
import { LyricsOverlay } from "~/components/lyrics-overlay";
import { Button } from "~/components/ui/button";
import { Slider } from "~/components/ui/slider";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";

// 设置图标 SVG
const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// 全屏图标 SVG
const FullscreenIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

// 退出全屏图标
const ExitFullscreenIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 14v4h4" />
    <path d="M20 10V6h-4" />
    <path d="M14 10h6" />
    <path d="M4 10h6" />
    <path d="M14 20v-6" />
    <path d="M4 4v6h6" />
    <path d="M20 20h-6" />
  </svg>
);

// 可视化组件
function VisualizerScene() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.5;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#6366f1" />
    </mesh>
  );
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Rhythm Vision" }];
}

export default function Player() {
  const {
    engineRef,
    featuresRef,
    playing,
    loaded,
    fileName,
    loadFile,
    togglePlay,
  } = useAudioEngine();

  const {
    ready: asrReady,
    loading: asrLoading,
    enabled: lyricsEnabled,
    setEnabled: setLyricsEnabled,
    lines,
    currentLine,
    error: asrError,
    reset: resetLyrics,
  } = useLiveTranscription(engineRef);

  const { recording, start: startRecord, stopAndDownload } = useRecorder();

  const [intensity, setIntensity] = useState(1.2);
  const [showTopBar, setShowTopBar] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 全屏切换
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await loadFile(file);
    resetLyrics();
    e.target.value = "";
  };

  const onToggleRecord = async () => {
    if (recording) {
      const name = (fileName ?? "rhythm-vision").replace(/\.[^.]+$/, "");
      await stopAndDownload(`${name}.webm`);
      return;
    }
    const canvas = canvasRef.current;
    const stream = engineRef.current?.getRecordStream();
    if (!canvas || !stream) return;
    startRecord(canvas, stream);
  };

  return (
    <div ref={containerRef} className="relative h-screen w-full bg-black">
      {/* 鼠标悬停顶部区域才显示的控制栏 */}
      <div
        className="absolute top-0 left-0 right-0 z-50 h-16"
        onMouseEnter={() => setShowTopBar(true)}
        onMouseLeave={() => setShowTopBar(false)}
      >
        <div
          className={`flex items-center justify-end gap-3 px-6 py-4 transition-all duration-300 ${
            showTopBar
              ? "bg-gradient-to-b from-black/60 to-transparent opacity-100"
              : "opacity-0"
          }`}
        >
          {/* 抽屉 - 设置按钮 */}
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
              >
                <SettingsIcon />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="bg-background/95 backdrop-blur">
              <DrawerHeader>
                <DrawerTitle>设置</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-8 space-y-6">
                {/* 音频文件选择 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">音频</h4>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={onFileChange}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1"
                    >
                      选择音频文件
                    </Button>
                    <Button onClick={togglePlay} disabled={!loaded}>
                      {playing ? "暂停" : "播放"}
                    </Button>
                  </div>
                  {fileName && (
                    <p className="text-sm text-muted-foreground truncate">
                      当前: {fileName}
                    </p>
                  )}
                </div>

                {/* 录制 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">录制</h4>
                  <Button
                    variant={recording ? "destructive" : "secondary"}
                    onClick={onToggleRecord}
                    disabled={!loaded || !canvasRef.current}
                    className="w-full"
                  >
                    {recording ? "停止并导出" : "开始录制"}
                  </Button>
                </div>

                {/* 歌词识别 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">歌词识别</h4>
                  <Button
                    variant={lyricsEnabled ? "default" : "outline"}
                    onClick={() => setLyricsEnabled((v) => !v)}
                    disabled={asrLoading}
                    className="w-full"
                  >
                    {asrLoading
                      ? "加载中..."
                      : lyricsEnabled
                        ? "歌词识别已开启"
                        : "开启歌词识别"}
                  </Button>
                  {asrError && (
                    <p className="text-xs text-destructive">{asrError}</p>
                  )}
                </div>

                {/* 氛围强度 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">
                    氛围强度: {intensity.toFixed(1)}
                  </h4>
                  <Slider
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={[intensity]}
                    onValueChange={(v) => {
                      const values = Array.isArray(v) ? v : [v];
                      setIntensity(values[0] ?? 1.2);
                    }}
                  />
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          {/* 全屏按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/20"
          >
            {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </Button>
        </div>
      </div>

      {/* Canvas 可视化区域 */}
      <Canvas
        className="size-full"
        camera={{ position: [0, 0, 5], fov: 55 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement;
        }}
      >
        <color attach="background" args={["#0f172a"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <VisualizerScene />
      </Canvas>

      {/* 歌词覆盖层 */}
      <LyricsOverlay
        lines={lines}
        currentLine={currentLine}
        visible={lyricsEnabled && (asrReady || Boolean(currentLine))}
      />

      {/* 加载提示 */}
      {asrLoading && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-xs text-white/80 backdrop-blur">
          正在加载语音识别模型…
        </div>
      )}

      {/* 录制中提示 */}
      {recording && (
        <div className="absolute top-20 right-6 flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300 backdrop-blur">
          <span className="size-2 animate-pulse rounded-full bg-red-400" />
          录制中
        </div>
      )}
    </div>
  );
}
