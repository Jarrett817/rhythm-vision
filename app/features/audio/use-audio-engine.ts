import { useEffect, useRef, useState } from "react";
import { AudioEngine } from "~/lib/audio/engine";
import { extractAudioFeatures } from "~/lib/audio/analyze";
import {
  EMPTY_AUDIO_FEATURES,
  type AudioFeatures,
} from "~/lib/audio/types";

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const frequencyRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(0));
  const waveformRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(0));
  const featuresRef = useRef<AudioFeatures>(EMPTY_AUDIO_FEATURES);

  const [features, setFeatures] = useState<AudioFeatures>(EMPTY_AUDIO_FEATURES);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    const engine = new AudioEngine();
    engineRef.current = engine;
    const analyser = engine.getAnalyser();
    frequencyRef.current = new Uint8Array(analyser.frequencyBinCount);
    waveformRef.current = new Uint8Array(analyser.fftSize);

    let frame = 0;
    const tick = () => {
      if (engine.playing) {
        const next = extractAudioFeatures(
          analyser,
          frequencyRef.current,
          waveformRef.current,
        );
        featuresRef.current = next;
        setFeatures(next);
        setPlaying(true);
      } else {
        setPlaying(false);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const loadFile = async (file: File) => {
    const engine = engineRef.current;
    if (!engine) return;
    await engine.loadFile(file);
    setLoaded(true);
    setFileName(file.name);
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
    fileName,
    loadFile,
    play,
    pause,
    togglePlay,
  };
}
