import { useCallback, useRef, useState } from "react";
import { SessionRecorder } from "~/features/export/recorder";

export function useRecorder() {
  const recorderRef = useRef(new SessionRecorder());
  const [recording, setRecording] = useState(false);

  const start = useCallback(
    (canvas: HTMLCanvasElement, audioStream: MediaStream) => {
      recorderRef.current.start(canvas, audioStream);
      setRecording(true);
    },
    [],
  );

  const stopAndDownload = useCallback(async (filename: string) => {
    const blob = await recorderRef.current.stop();
    setRecording(false);
    if (blob.size > 0) SessionRecorder.download(blob, filename);
  }, []);

  return { recording, start, stopAndDownload };
}
