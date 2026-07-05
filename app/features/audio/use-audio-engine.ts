import { useCallback, useEffect, useRef, useState } from "react";
import { AudioEngine, type AudioInputMode } from "~/lib/audio/engine";
import { extractAudioFeatures } from "~/lib/audio/analyze";
import { detectMood, type SongMood } from "~/lib/audio/mood";
import {
  addTrack,
  getCurrentTrackId,
  getLibrary,
  getTrack,
  removeTrack as removeStoredTrack,
  setCurrentTrackId,
  trackToFile,
  type StoredTrack,
} from "~/lib/storage/audio-store";
import {
  EMPTY_AUDIO_FEATURES,
  type AudioFeatures,
} from "~/lib/audio/types";

export function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const frequencyRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(0));
  const waveformRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(0));
  const featuresRef = useRef<AudioFeatures>(EMPTY_AUDIO_FEATURES);

  const [features, setFeatures] = useState<AudioFeatures>(EMPTY_AUDIO_FEATURES);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [library, setLibrary] = useState<StoredTrack[]>([]);
  const [currentTrackId, setCurrentTrackIdState] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [detectedMood, setDetectedMood] = useState<SongMood>("slow");
  const [inputMode, setInputMode] = useState<AudioInputMode>("mic");
  const [micError, setMicError] = useState<string | null>(null);
  const moodTimerRef = useRef(0);

  const currentTrack =
    library.find((t) => t.id === currentTrackId) ?? null;

  const refreshLibrary = useCallback(async () => {
    const [tracks, activeId] = await Promise.all([
      getLibrary(),
      getCurrentTrackId(),
    ]);
    setLibrary(tracks);
    setCurrentTrackIdState(activeId);
    return { tracks, activeId };
  }, []);

  const loadTrackById = useCallback(async (id: string, autoplay = false) => {
    const engine = engineRef.current;
    if (!engine) return;
    const track = await getTrack(id);
    if (!track) return;
    const file = trackToFile(track);
    await engine.loadFile(file);
    await setCurrentTrackId(id);
    setCurrentTrackIdState(id);
    setLoaded(true);
    setDuration(engine.getDuration());
    setCurrentTime(0);
    setInputMode("file");
    if (autoplay) await engine.play();
  }, []);

  const startMic = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      setMicError(null);
      await engine.startMicrophone();
      setInputMode("mic");
      setPlaying(true);
    } catch (err) {
      setMicError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "麦克风权限被拒绝，请在浏览器中允许后重试"
          : "无法开启麦克风收音",
      );
      setInputMode("file");
    }
  }, []);

  const stopMic = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.stopMicrophone();
    setInputMode("file");
    setPlaying(false);
  }, []);

  useEffect(() => {
    let disposed = false;
    const engine = new AudioEngine();
    engineRef.current = engine;
    const analyser = engine.getAnalyser();
    frequencyRef.current = new Uint8Array(analyser.frequencyBinCount);
    waveformRef.current = new Uint8Array(analyser.fftSize);

    engine.onTimeUpdate(() => {
      if (disposed) return;
      setCurrentTime(engine.getCurrentTime());
      const d = engine.getDuration();
      if (d > 0) setDuration(d);
    });

    let frame = 0;
    let uiTick = 0;
    let wasPlaying = false;
    const tick = () => {
      const isPlaying = engine.playing;
      if (isPlaying) {
        const next = extractAudioFeatures(
          analyser,
          frequencyRef.current,
          waveformRef.current,
        );
        featuresRef.current = next;
        // UI 面板（band monitor）不需要 60fps，每 6 帧刷新一次即可，
        // 避免每帧 setState 触发整棵组件树重渲染
        uiTick += 1;
        if (uiTick % 6 === 0) setFeatures(next);
        moodTimerRef.current += 1;
        if (moodTimerRef.current % 30 === 0) {
          setDetectedMood(detectMood(next));
        }
      }
      if (isPlaying !== wasPlaying) {
        wasPlaying = isPlaying;
        setPlaying(isPlaying);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    void (async () => {
      try {
        const { tracks, activeId } = await refreshLibrary();
        if (disposed) return;
        if (activeId && tracks.some((t) => t.id === activeId)) {
          await loadTrackById(activeId);
        }
      } catch {
        // 缓存损坏时静默忽略
      } finally {
        if (!disposed) setRestoring(false);
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      engine.onTimeUpdate(null);
      engine.dispose();
      engineRef.current = null;
    };
  }, [loadTrackById, refreshLibrary]);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    let lastId: string | null = null;
    for (const file of list) {
      const track = await addTrack(file);
      lastId = track.id;
    }
    await refreshLibrary();
    if (lastId) await loadTrackById(lastId, true);
  };

  const selectTrack = async (id: string) => {
    const wasPlaying = engineRef.current?.playing ?? false;
    await loadTrackById(id, wasPlaying);
  };

  const removeTrack = async (id: string) => {
    const wasCurrent = id === currentTrackId;
    await removeStoredTrack(id);
    const { tracks, activeId } = await refreshLibrary();
    if (wasCurrent) {
      if (activeId) await loadTrackById(activeId);
      else {
        engineRef.current?.stop();
        setLoaded(false);
        setCurrentTime(0);
        setDuration(0);
      }
    }
    if (tracks.length === 0) setPlaying(false);
  };

  const seek = (time: number) => {
    engineRef.current?.seek(time);
    setCurrentTime(time);
  };

  const play = async () => {
    await engineRef.current?.play();
    setPlaying(true);
  };

  const pause = () => {
    engineRef.current?.pause();
    setPlaying(false);
  };

  const togglePlay = async () => {
    if (playing) pause();
    else await play();
  };

  return {
    engineRef,
    features,
    featuresRef,
    playing,
    loaded,
    restoring,
    library,
    currentTrack,
    currentTrackId,
    currentTime,
    duration,
    detectedMood,
    inputMode,
    micError,
    startMic,
    stopMic,
    addFiles,
    selectTrack,
    removeTrack,
    seek,
    play,
    pause,
    togglePlay,
  };
}
