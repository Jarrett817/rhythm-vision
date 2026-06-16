export class SessionRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  start(canvas: HTMLCanvasElement, audioStream: MediaStream) {
    const videoStream = canvas.captureStream(30);
    const combined = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ]);

    const mimeType = SessionRecorder.pickMimeType();
    this.chunks = [];
    this.recorder = new MediaRecorder(combined, mimeType ? { mimeType } : undefined);
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(200);
  }

  async stop(): Promise<Blob> {
    const recorder = this.recorder;
    if (!recorder) return new Blob();

    return new Promise((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: recorder.mimeType || "video/webm" }));
        this.recorder = null;
        this.chunks = [];
      };
      recorder.stop();
    });
  }

  get recording() {
    return this.recorder?.state === "recording";
  }

  private static pickMimeType() {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    return candidates.find((t) => MediaRecorder.isTypeSupported(t));
  }

  static download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
