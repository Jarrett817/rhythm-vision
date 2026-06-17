export class AudioEngine {
  private audio = new Audio();
  private context: AudioContext;
  private analyser: AnalyserNode;
  private source: MediaElementAudioSourceNode;
  private recordDestination: MediaStreamAudioDestinationNode;
  private objectUrl: string | null = null;
  private audioBuffer: AudioBuffer | null = null;

  constructor() {
    this.audio.crossOrigin = "anonymous";
    this.audio.loop = true;
    this.context = new AudioContext();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.85;
    this.source = this.context.createMediaElementSource(this.audio);
    this.recordDestination = this.context.createMediaStreamDestination();
    this.source.connect(this.analyser);
    this.analyser.connect(this.context.destination);
    this.analyser.connect(this.recordDestination);
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

  get playing() {
    return !this.audio.paused && !this.audio.ended;
  }

  get loaded() {
    return Boolean(this.audio.src);
  }

  async loadFile(file: File) {
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
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.source.disconnect();
    this.analyser.disconnect();
    this.recordDestination.disconnect();
    void this.context.close();
  }
}
