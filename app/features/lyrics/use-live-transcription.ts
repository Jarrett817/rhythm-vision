import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioEngine } from "~/lib/audio/engine";
import { extractAudioChunk, resampleTo16k } from "~/lib/audio/resample";
import type { WorkerReply } from "~/workers/whisper.worker";

const CHUNK_SEC = 4;
const OVERLAP_SEC = 1;

export function useLiveTranscription(engineRef: React.RefObject<AudioEngine | null>) {
  const workerRef = useRef<Worker | null>(null);
  const chunkIdRef = useRef(0);
  const lastChunkEndRef = useRef(0);
  const pendingRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || workerRef.current) return;

    const worker = new Worker(
      new URL("~/workers/whisper.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;
    setLoading(true);
    setError(null);

    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const data = event.data;
      if (data.type === "progress") return;
      if (data.type === "ready") {
        setReady(true);
        setLoading(false);
        return;
      }
      if (data.type === "transcript") {
        pendingRef.current = false;
        if (data.text) {
          setCurrentLine(data.text);
          setLines((prev) => {
            const next = [...prev, data.text];
            return next.slice(-6);
          });
        }
        return;
      }
      if (data.type === "error") {
        pendingRef.current = false;
        setError(data.message);
        setLoading(false);
      }
    };

    worker.postMessage({ type: "init" });

    return () => {
      worker.terminate();
      workerRef.current = null;
      pendingRef.current = false;
      setReady(false);
      setLoading(false);
    };
  }, [enabled]);

  const reset = useCallback(() => {
    chunkIdRef.current = 0;
    lastChunkEndRef.current = 0;
    pendingRef.current = false;
    setLines([]);
    setCurrentLine("");
    setError(null);
  }, []);

  const transcribeTick = useCallback(() => {
    const engine = engineRef.current;
    const worker = workerRef.current;
    if (!engine?.playing || !worker || !ready || !enabled || pendingRef.current) return;

    const buffer = engine.getAudioBuffer();
    if (!buffer) return;

    const currentTime = engine.getCurrentTime();
    if (currentTime - lastChunkEndRef.current < CHUNK_SEC - OVERLAP_SEC) return;

    const start = Math.max(0, currentTime - OVERLAP_SEC);
    const chunk = extractAudioChunk(buffer, start, CHUNK_SEC);
    if (chunk.length < 16_000 * 0.5) return;

    const samples = resampleTo16k(chunk, buffer.sampleRate);
    const chunkId = chunkIdRef.current++;
    pendingRef.current = true;
    lastChunkEndRef.current = currentTime;

    worker.postMessage({
      type: "transcribe",
      chunkId,
      samples,
      language: "chinese",
    });
  }, [engineRef, ready, enabled]);

  useEffect(() => {
    const id = window.setInterval(transcribeTick, 1500);
    return () => window.clearInterval(id);
  }, [transcribeTick]);

  return {
    ready,
    loading,
    enabled,
    setEnabled,
    lines,
    currentLine,
    error,
    reset,
  };
}
