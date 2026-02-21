const SOUNDS = {
  soundtrack: "/sounds/chill_loop.mp3",
  boop: "/sounds/boop.mp3",
  gameEnd: "/sounds/game_end.mp3",
  win: "/sounds/win.mp3",
} as const;

const SOUNDTRACK_VOLUME = 0.35;
const SFX_VOLUME = 0.6;

export class AudioManager {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private soundtrackSource: AudioBufferSourceNode | null = null;
  private soundtrackGain: GainNode | null = null;
  private loaded = false;

  async init() {
    this.ctx = new AudioContext();
    await this.preload();
    this.loaded = true;
  }

  private async preload() {
    const entries = Object.entries(SOUNDS);
    const results = await Promise.allSettled(
      entries.map(async ([key, url]) => {
        const resp = await fetch(url);
        if (!resp.ok) return;
        const buf = await resp.arrayBuffer();
        const decoded = await this.ctx!.decodeAudioData(buf);
        this.buffers.set(key, decoded);
      }),
    );
    for (const r of results) {
      if (r.status === "rejected") console.warn("AudioManager: failed to load a sound", r.reason);
    }
  }

  /** Ensure AudioContext is resumed (must be called from a user gesture context). */
  async resume() {
    if (this.ctx?.state === "suspended") await this.ctx.resume();
  }

  startSoundtrack() {
    const buffer = this.buffers.get("soundtrack");
    if (!buffer || !this.ctx) return;

    this.stopSoundtrack();

    const gain = this.ctx.createGain();
    gain.gain.value = SOUNDTRACK_VOLUME;
    gain.connect(this.ctx.destination);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start();

    this.soundtrackSource = source;
    this.soundtrackGain = gain;
  }

  stopSoundtrack() {
    try { this.soundtrackSource?.stop(); } catch { /* already stopped */ }
    this.soundtrackSource?.disconnect();
    this.soundtrackGain?.disconnect();
    this.soundtrackSource = null;
    this.soundtrackGain = null;
  }

  /** Play the fallback boop (used when no recorded paddle sound exists). */
  playBoop() {
    this.playOneShot("boop");
  }

  playGameEnd() {
    this.playOneShot("gameEnd");
  }

  playWin() {
    if (this.buffers.has("win")) {
      this.playOneShot("win");
    } else {
      this.playOneShot("gameEnd");
    }
  }

  hasBuffer(key: string) {
    return this.buffers.get(key) ?? null;
  }

  get audioContext() {
    return this.ctx;
  }

  private playOneShot(key: string) {
    const buffer = this.buffers.get(key);
    if (!buffer || !this.ctx) return;

    const gain = this.ctx.createGain();
    gain.gain.value = SFX_VOLUME;
    gain.connect(this.ctx.destination);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.start();
  }

  destroy() {
    this.stopSoundtrack();
    this.buffers.clear();
    this.ctx?.close();
    this.ctx = null;
    this.loaded = false;
  }
}
