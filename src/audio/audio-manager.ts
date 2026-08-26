/**
 * 音频管理器：WebAudio 程序化音效合成（ADR-011：零外部资产）。
 * 领域逻辑（开关状态）与合成器实现分离；开关状态由外部设置系统管理。
 *
 * 音效清单：
 * - move: 短促点击声（角色移动）
 * - block: 低沉碰撞声（受阻）
 * - cancel: 双音冲突声（指令取消）
 * - win: 上升琶音（通关）
 * - teleport: 滑音（传送）
 * - collapse: 碎裂声（脆弱格坍塌）
 * - pulse: 双音（脉冲门解锁）
 * - switch: 拨动声（映射切换）
 * - token: 清脆叮声（获得暂停令牌）
 * - pause: 闷响（暂停消耗）
 * - door: 门开/关声
 * - uiTap: 轻触声（UI 按钮）
 */

export type SoundId =
  | 'move'
  | 'block'
  | 'cancel'
  | 'win'
  | 'teleport'
  | 'collapse'
  | 'pulse'
  | 'switch'
  | 'token'
  | 'pause'
  | 'door'
  | 'uiTap';

export interface AudioState {
  music: boolean;
  sfx: boolean;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private state: AudioState = { music: true, sfx: true };

  /** 更新音频状态（由外部设置系统调用）。 */
  setState(state: AudioState): void {
    this.state = { ...state };
  }

  get sfxEnabled(): boolean {
    return this.state.sfx;
  }

  get musicEnabled(): boolean {
    return this.state.music;
  }

  /** 初始化 AudioContext（需在用户首次交互后调用以解锁浏览器限制）。 */
  ensureUnlocked(): AudioContext {
    if (this.ctx && this.unlocked) return this.ctx;
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.unlocked = true;
    return this.ctx;
  }

  /** 播放音效（仅当 sfx 启用时）。 */
  play(id: SoundId): void {
    if (!this.state.sfx) return;
    try {
      const ctx = this.ensureUnlocked();
      switch (id) {
        case 'move':
          this.tone(ctx, 800, 0.06, 0.15);
          break;
        case 'block':
          this.tone(ctx, 200, 0.08, 0.25, 'sawtooth');
          break;
        case 'cancel':
          this.tone(ctx, 300, 0.05, 0.2);
          this.tone(ctx, 500, 0.05, 0.25);
          break;
        case 'win':
          this.winArp(ctx);
          break;
        case 'teleport':
          this.slide(ctx, 400, 800, 0.12, 0.15);
          break;
        case 'collapse':
          this.noise(ctx, 0.1, 0.3);
          break;
        case 'pulse':
          this.tone(ctx, 660, 0.08, 0.1);
          this.tone(ctx, 880, 0.08, 0.2);
          break;
        case 'switch':
          this.tone(ctx, 600, 0.04, 0.1, 'square');
          break;
        case 'token':
          this.tone(ctx, 1200, 0.1, 0.15, 'sine');
          break;
        case 'pause':
          this.tone(ctx, 250, 0.08, 0.2, 'triangle');
          break;
        case 'door':
          this.tone(ctx, 500, 0.05, 0.12);
          break;
        case 'uiTap':
          this.tone(ctx, 1000, 0.03, 0.06, 'sine');
          break;
      }
    } catch {
      // 音频失败时不阻断游戏
    }
  }

  /** 播放背景音乐（简单循环音调）。 */
  playMusic(): void {
    if (!this.state.music) return;
    // 此处可扩展背景音乐；当前留空（V1 不强制背景音乐）
  }

  stopMusic(): void {
    // 留空
  }

  /** 释放资源。 */
  dispose(): void {
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.unlocked = false;
  }

  // ===== 合成器原语 =====

  private tone(
    ctx: AudioContext,
    freq: number,
    duration: number,
    volume: number = 0.15,
    type: OscillatorType = 'sine'
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.01);
  }

  private slide(
    ctx: AudioContext,
    from: number,
    to: number,
    duration: number,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(to, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.01);
  }

  private noise(ctx: AudioContext, duration: number, volume: number): void {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, Math.ceil(bufferSize), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  }

  private winArp(ctx: AudioContext): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  }
}

/** 全局单例。 */
export const audioManager = new AudioManager();
