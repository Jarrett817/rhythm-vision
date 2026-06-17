import { useRef, useState, useEffect } from "react";
import type { Route } from "./+types/home";
import { Settings, Maximize2, Minimize2, Loader2, Circle } from "lucide-react";
import { useAudioEngine } from "~/features/audio/use-audio-engine";
import { useLiveTranscription } from "~/features/lyrics/use-live-transcription";
import { useRecorder } from "~/features/export/use-recorder";
import {
  getVisualizersByCategory,
  getVisualizer,
  getDefaultVisualizer,
} from "~/features/visualizers/catalog";
import { prefetchAdjacentVisualizers } from "~/features/visualizers/lazy-loaders";
import { LazyVisualizer } from "~/components/lazy-visualizer";
import { useSceneUrl } from "~/features/visualizers/use-scene-url";
import { useHomePreferences } from "~/lib/stores/home-preferences";
import { AudioBandMonitor } from "~/components/audio-band-monitor";
import { AudioLibraryPanel } from "~/components/audio-library-panel";
import { VisualizerEdgeNav } from "~/components/visualizer-edge-nav";
import { LyricsOverlay } from "~/components/lyrics-overlay";
import { Button } from "~/components/ui/button";
import { Slider } from "~/components/ui/slider";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import { motion, AnimatePresence } from "motion/react";
import { VisualizerSceneHost } from "~/components/visualizer-scene-host";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Rhythm Vision" }];
}

export default function Home() {
  const audio = useAudioEngine();
  const {
    engineRef,
    features,
    featuresRef,
    loaded,
    currentTrack,
    currentTrackId,
  } = audio;

  const {
    intensity,
    setIntensity,
    lyricsEnabled,
    setLyricsEnabled,
    visualizerCategory,
    setVisualizerCategory,
  } = useHomePreferences();

  const {
    ready: asrReady,
    loading: asrLoading,
    enabled: asrEnabled,
    setEnabled: setAsrEnabled,
    lines,
    currentLine,
    error: asrError,
    reset: resetLyrics,
  } = useLiveTranscription(engineRef);

  useEffect(() => {
    setAsrEnabled(lyricsEnabled);
  }, [lyricsEnabled, setAsrEnabled]);

  useEffect(() => {
    resetLyrics();
  }, [currentTrackId, resetLyrics]);

  const { recording, start: startRecord, stopAndDownload } = useRecorder();

  const { visualizerId, setVisualizerId } = useSceneUrl();
  const [showTopBar, setShowTopBar] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const visualizer = getVisualizer(visualizerId)!;
  const filteredVisualizers = getVisualizersByCategory(visualizerCategory);

  useEffect(() => {
    prefetchAdjacentVisualizers(
      getVisualizersByCategory(visualizerCategory).map((v) => v.id),
      visualizerId,
    );
  }, [visualizerId, visualizerCategory]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const list = filteredVisualizers;
      const idx = list.findIndex((v) => v.id === visualizerId);
      if (idx < 0) return;
      const next =
        e.key === "ArrowLeft"
          ? list[(idx - 1 + list.length) % list.length]
          : list[(idx + 1) % list.length];
      if (next) setVisualizerId(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visualizerId, visualizerCategory, filteredVisualizers, setVisualizerId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const onToggleRecord = async () => {
    if (recording) {
      const name = (currentTrack?.fileName ?? "rhythm-vision").replace(/\.[^.]+$/, "");
      await stopAndDownload(`${name}.webm`);
      return;
    }
    const canvas = canvasRef.current;
    const stream = engineRef.current?.getRecordStream();
    if (!canvas || !stream) return;
    startRecord(canvas, stream);
  };

  return (
    <div ref={containerRef} className="home-shell fixed inset-0 bg-black">
      <div
        className="absolute top-0 left-0 right-0 z-50 h-16"
        onMouseEnter={() => setShowTopBar(true)}
        onMouseLeave={() => setShowTopBar(false)}
      >
        <motion.div
          className="flex items-center justify-between px-6 py-4"
          initial={false}
          animate={{
            opacity: showTopBar ? 1 : 0,
            y: showTopBar ? 0 : -8,
          }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{
            background: showTopBar
              ? "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)"
              : "transparent",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={visualizerId}
              className="text-white"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.35 }}
            >
              <h3 className="font-medium">{visualizer.name}</h3>
              <p className="text-xs text-white/70">{visualizer.imagery}</p>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-2">
            <Drawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              direction="right"
            >
              <DrawerTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                >
                  <Settings className="size-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="bg-background/95 backdrop-blur sm:max-w-md">
                <DrawerHeader>
                  <DrawerTitle>设置</DrawerTitle>
                </DrawerHeader>
                <div className="overflow-y-auto px-4 pb-8 space-y-6 max-h-[calc(100vh-5rem)]">
                  <AudioBandMonitor features={features} />
                  <AudioLibraryPanel engine={audio} />

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">效果分类</Label>
                    <Tabs
                      value={visualizerCategory}
                      onValueChange={(v) => {
                        setVisualizerCategory(v as "all" | "abstract" | "landscape");
                        const currentInCategory = filteredVisualizers.find(
                          (viz) => viz.id === visualizerId,
                        );
                        if (!currentInCategory) {
                          setVisualizerId(
                            filteredVisualizers[0]?.id ?? getDefaultVisualizer(),
                          );
                        }
                      }}
                    >
                      <TabsList className="w-full">
                        <TabsTrigger value="all" className="flex-1">全部</TabsTrigger>
                        <TabsTrigger value="abstract" className="flex-1">抽象</TabsTrigger>
                        <TabsTrigger value="landscape" className="flex-1">景观</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      可视化效果 ({filteredVisualizers.length}个)
                    </Label>
                    <div className="grid grid-cols-1 gap-2">
                      {filteredVisualizers.map((v) => (
                        <Card
                          key={v.id}
                          size="sm"
                          className={
                            visualizerId === v.id
                              ? "border-primary/40 bg-primary/5"
                              : "cursor-pointer hover:bg-muted/30"
                          }
                          onClick={() => setVisualizerId(v.id)}
                        >
                          <CardHeader className="pb-1">
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle className="text-sm">{v.name}</CardTitle>
                              <Badge variant="secondary">{v.dimension}</Badge>
                            </div>
                            <CardDescription className="text-xs">
                              {v.imagery}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="text-[10px] text-muted-foreground">
                            {v.audioMap}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">录制</Label>
                    <Button
                      variant={recording ? "destructive" : "secondary"}
                      onClick={onToggleRecord}
                      disabled={!loaded || !canvasRef.current}
                      className="w-full"
                    >
                      {recording ? "停止并导出" : "开始录制"}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">歌词识别</Label>
                    <Button
                      variant={lyricsEnabled ? "default" : "outline"}
                      onClick={() => setLyricsEnabled(!lyricsEnabled)}
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
                      <Alert variant="destructive">
                        <AlertDescription>{asrError}</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      氛围强度: {intensity.toFixed(1)}
                    </Label>
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

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? (
                <Minimize2 className="size-5" />
              ) : (
                <Maximize2 className="size-5" />
              )}
            </Button>
          </div>
        </motion.div>
      </div>

      <VisualizerSceneHost visualizerId={visualizerId}>
        <LazyVisualizer
          id={visualizerId}
          featuresRef={featuresRef}
          intensity={intensity}
          onCanvasReady={(canvas) => {
            canvasRef.current = canvas;
          }}
        />
      </VisualizerSceneHost>

      <VisualizerEdgeNav
        visualizers={filteredVisualizers}
        currentId={visualizerId}
        onChange={setVisualizerId}
      />

      <LyricsOverlay
        lines={lines}
        currentLine={currentLine}
        visible={lyricsEnabled && asrEnabled && (asrReady || Boolean(currentLine))}
      />

      {asrLoading && (
        <Badge className="absolute top-20 left-1/2 -translate-x-1/2 gap-1.5 bg-black/50 text-white/80 backdrop-blur">
          <Loader2 className="size-3 animate-spin" />
          正在加载语音识别模型…
        </Badge>
      )}

      {recording && (
        <Badge
          variant="destructive"
          className="absolute top-20 right-6 gap-2 bg-red-500/20 text-red-300 backdrop-blur"
        >
          <Circle className="size-2 fill-red-400 text-red-400 animate-pulse" />
          录制中
        </Badge>
      )}
    </div>
  );
}
