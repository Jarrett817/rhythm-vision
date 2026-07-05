export type AudioInputMode = "file" | "mic";

export class AudioEngine {
  private audio = new Audio();
  private context: AudioContext;
  private analyser: AnalyserNode;
  private source: MediaElementAudioSourceNode;
  private recordDestination: MediaStreamAudioDestinationNode;
  private objectUrl: string | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private inputMode: AudioInputMode = "file";

  constructor() {
    this.audio.crossOrigin = "anonymous";
    this.audio.loop = true;
    this.context = new AudioContext();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.85;
    this.source = this.context.createMediaElementSource(this.audio);
    this.recordDestination = this.context.createMediaStreamDestination();
    // analyser 为纯分析分支，不接扬声器；声音输出与录制直接从各输入源引出，
    // 避免麦克风经 analyser 回授到扬声器产生啸叫
    this.source.connect(this.analyser);
    this.source.connect(this.context.destination);
    this.source.connect(this.recordDestination);
  }

  getAnalyser() {
    return this.analyser;
  }

  getAudioContext() {
    return this.context;
  }

  getAudioBuffer() {
    return this.audioBuffer;
  }

  getCurrentTime() {
    return this.audio.currentTime;
  }

  getDuration() {
    return Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
  }

  seek(time: number) {
    if (!this.loaded) return;
    this.audio.currentTime = Math.max(0, Math.min(time, this.getDuration()));
  }

  onTimeUpdate(callback: (() => void) | null) {
    this.audio.ontimeupdate = callback;
  }

  onEnded(callback: (() => void) | null) {
    this.audio.onended = callback;
  }

  getRecordStream() {
    return this.recordDestination.stream;
  }

  getInputMode() {
    return this.inputMode;
  }

  get micActive() {
    return this.inputMode === "mic" && this.micSource !== null;
  }

  /** 切到麦克风收音：需在用户手势中调用 */
  async startMicrophone() {
    if (this.context.state === "suspended") await this.context.resume();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    this.stop();
    this.source.disconnect();

    this.micStream = stream;
    this.micSource = this.context.createMediaStreamSource(stream);
    // 麦克风不接 destination，避免扬声器啸叫回授；仍接分析器与录制目标
    this.micSource.connect(this.analyser);
    this.micSource.connect(this.recordDestination);
    this.inputMode = "mic";
  }

  /** 停止麦克风并切回文件源 */
  stopMicrophone() {
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micStream) {
      for (const track of this.micStream.getTracks()) track.stop();
      this.micStream = null;
    }
    if (this.inputMode === "mic") {
      this.source.connect(this.analyser);
      this.source.connect(this.context.destination);
      this.source.connect(this.recordDestination);
      this.inputMode = "file";
    }
  }

  get playing() {
    if (this.inputMode === "mic") return this.micActive;
    return !this.audio.paused && !this.audio.ended;
  }

  get loaded() {
    return Boolean(this.audio.src);
  }

  async loadFile(file: File) {
    if (this.inputMode === "mic") this.stopMicrophone();
    this.stop();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.context.decodeAudioData(arrayBuffer.slice(0));

    this.objectUrl = URL.createObjectURL(file);
    this.audio.src = this.objectUrl;
    await this.audio.load();
  }

  async play() {
    if (!this.loaded) return;
    if (this.context.state === "suspended") await this.context.resume();
    await this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  dispose() {
    this.stop();
    this.stopMicrophone();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.source.disconnect();
    this.analyser.disconnect();
    this.recordDestination.disconnect();
    void this.context.close();
  }
}
