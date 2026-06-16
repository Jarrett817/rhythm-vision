import { Link } from "react-router";
import { useRef, useState } from "react";
import type { Route } from "./+types/player";
import { useAudioEngine } from "~/features/audio/use-audio-engine";
import { useLiveTranscription } from "~/features/lyrics/use-live-transcription";
import { useRecorder } from "~/features/export/use-recorder";
import {
  VISUALIZERS,
  type VisualizerId,
} from "~/features/visualizers/catalog";
import { LyricsOverlay } from "~/components/lyrics-overlay";
import { Button } from "~/components/ui/button";
import { Slider } from "~/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardContent } from "~/components/ui/card";

export function meta({}: Route.MetaArgs) {
  return [{ title: "播放器 - Rhythm Vision" }];
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

  const [visualizerId, setVisualizerId] = useState<VisualizerId>("dream-rain");
  const [intensity, setIntensity] = useState(1.2);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visualizer = VISUALIZERS.find((v) => v.id === visualizerId)!;
  const { Component } = visualizer;

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
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Rhythm Vision
        </Link>
        <span className="truncate text-sm text-muted-foreground">
          {fileName ?? "未选择音频"}
        </span>
      </header>

      <div className="relative min-h-0 flex-1">
        <Component
          featuresRef={featuresRef}
          intensity={intensity}
          onCanvasReady={(canvas) => {
            canvasRef.current = canvas;
          }}
        />
        <LyricsOverlay
          lines={lines}
          currentLine={currentLine}
          visible={lyricsEnabled && (asrReady || Boolean(currentLine))}
        />
        {asrLoading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-xs text-white/80 backdrop-blur">
            正在加载语音识别模型…
          </div>
        )}
        {recording && (
          <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300 backdrop-blur">
            <span className="size-2 animate-pulse rounded-full bg-red-400" />
            录制中
          </div>
        )}
      </div>

      <Card className="m-4 mt-0 rounded-xl">
        <CardContent className="flex flex-col gap-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={onFileChange}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              选择音频
            </Button>
            <Button onClick={togglePlay} disabled={!loaded}>
              {playing ? "暂停" : "播放"}
            </Button>
            <Button
              variant={recording ? "destructive" : "secondary"}
              onClick={onToggleRecord}
              disabled={!loaded || !canvasRef.current}
            >
              {recording ? "停止并导出" : "录制"}
            </Button>
            <Button
              variant={lyricsEnabled ? "default" : "outline"}
              onClick={() => setLyricsEnabled((v) => !v)}
              disabled={asrLoading}
            >
              {lyricsEnabled ? "歌词识别开" : "歌词识别关"}
            </Button>
          </div>

          {asrError && (
            <p className="text-xs text-destructive">{asrError}</p>
          )}

          <Tabs
            value={visualizerId}
            onValueChange={(v) => setVisualizerId(v as VisualizerId)}
          >
            <TabsList>
              {VISUALIZERS.map((v) => (
                <TabsTrigger key={v.id} value={v.id}>
                  {v.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <p className="text-xs text-muted-foreground">
            {visualizer.description}
          </p>

          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-sm text-muted-foreground">
              氛围
            </span>
            <Slider
              min={0.5}
              max={2}
              step={0.1}
              value={[intensity]}
              onValueChange={(v) => {
                const values = Array.isArray(v) ? v : [v];
                setIntensity(values[0] ?? 1.2);
              }}
              className="flex-1"
            />
            <span className="w-8 text-right text-sm tabular-nums">
              {intensity.toFixed(1)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
