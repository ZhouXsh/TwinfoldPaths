import Phaser from 'phaser';
import type { ActorMoveInfo, Direction, GameState, MappingMode, Point } from '../domain/types';
import { applyCommand, restart, undo } from '../domain/engine';
import { createInitialState } from '../domain/level';
import { DELTA, equalsPoint } from '../domain/point';
import type { LevelRecord } from '../content/validate';
import { FIRST_LEVEL_ID, getLevelById, levelLinearIndex, nextLevelId } from '../content/levels';
import { InputGate } from '../input/gate';
import { swipeToDirection } from '../input/swipe';
import {
  localStorageStore,
  loadSave,
  loadSettings,
  persistSave,
  recordWin
} from '../persistence/save-store';
import { audioManager } from '../audio/audio-manager';
import {
  bindButton,
  setLevelLabel,
  setMappingLabel,
  setMoveCount,
  setTargetMoves,
  setStatusText,
  setHintDirection,
  showBars,
  showDirectionPreview,
  hideDirectionPreview
} from './dom-ui';
import { recordEvent } from '../telemetry/telemetry';

/** 移动动画时长（阶段 06 要求 150–220ms）。 */
const MOVE_ANIM_MS = 180;
const CANCEL_SHAKE_MS = 120;
const WIN_DELAY_MS = 700;
const BOARD_SIZE = 360;
const DIR_PREVIEW_MIN_MS = 80;

const MAPPING_NAMES: Record<MappingMode, string> = {
  H_MIRROR: '水平镜像',
  V_MIRROR: '垂直镜像',
  ROTATE_CW: '顺时针旋转'
};

const SWITCHER_TEXTURES: Record<MappingMode, string> = {
  H_MIRROR: 'switcher-H',
  V_MIRROR: 'switcher-V',
  ROTATE_CW: 'switcher-R'
};

const ONEWAY_TEXTURES: Record<'UP' | 'DOWN' | 'LEFT' | 'RIGHT', string> = {
  UP: 'oneway-UP',
  DOWN: 'oneway-DOWN',
  LEFT: 'oneway-LEFT',
  RIGHT: 'oneway-RIGHT'
};

const KEY_DIRECTIONS: ReadonlyArray<readonly [string, Direction]> = [
  ['UP', 'UP'],
  ['DOWN', 'DOWN'],
  ['LEFT', 'LEFT'],
  ['RIGHT', 'RIGHT'],
  ['W', 'UP'],
  ['S', 'DOWN'],
  ['A', 'LEFT'],
  ['D', 'RIGHT']
];

const DIR_BUTTONS: ReadonlyArray<readonly [string, Direction]> = [
  ['btn-up', 'UP'],
  ['btn-down', 'DOWN'],
  ['btn-left', 'LEFT'],
  ['btn-right', 'RIGHT']
];

interface GameSceneData {
  levelId?: string;
}

export class GameScene extends Phaser.Scene {
  private level: LevelRecord | null = null;
  private state: GameState | null = null;
  private gate = new InputGate();
  private wonLocked = false;
  private tile = 48;
  private originX = 0;
  private originY = 0;
  private blueActor: Phaser.GameObjects.Image | null = null;
  private orangeActor: Phaser.GameObjects.Image | null = null;
  private blueExit: Phaser.GameObjects.Image | null = null;
  private orangeExit: Phaser.GameObjects.Image | null = null;
  private exitBaseScale = 1;
  private doorSprites = new Map<string, Phaser.GameObjects.Image>();
  private plateSprites: Array<{ sprite: Phaser.GameObjects.Image; x: number; y: number }> = [];
  private fragileSprites: Array<{ sprite: Phaser.GameObjects.Image; x: number; y: number }> = [];
  private pulseDoorSprites: Array<{ sprite: Phaser.GameObjects.Image; pairId: string }> = [];
  private pulseSwitchSprites: Array<{ sprite: Phaser.GameObjects.Image; x: number; y: number }> =
    [];
  private blueToken: Phaser.GameObjects.Image | null = null;
  private orangeToken: Phaser.GameObjects.Image | null = null;
  private cleanupFns: Array<() => void> = [];
  private reducedAnim = false;
  private pointerDownPos: { x: number; y: number } | null = null;
  private pointerDownTime = 0;
  private dirPreviewTimer: Phaser.Time.TimerEvent | null = null;
  private hintRestoreTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData): void {
    const level = getLevelById(data.levelId ?? FIRST_LEVEL_ID);
    if (!level) throw new Error(`关卡不存在: ${String(data.levelId)}`);
    this.level = level;
  }

  create(): void {
    const level = this.level;
    if (!level) throw new Error('GameScene 缺少关卡数据');
    this.state = createInitialState(level);
    this.wonLocked = false;
    this.gate.reset();
    this.doorSprites.clear();
    this.plateSprites = [];
    this.fragileSprites = [];
    this.pulseDoorSprites = [];
    this.pulseSwitchSprites = [];
    this.blueToken = null;
    this.orangeToken = null;
    this.pointerDownPos = null;
    this.pointerDownTime = 0;
    this.hintRestoreTimer?.remove(false);
    this.hintRestoreTimer = null;

    // 加载设置
    const settings = loadSettings(localStorageStore());
    this.reducedAnim = settings.reducedAnim;
    audioManager.setState({ music: settings.music, sfx: settings.sfx });

    this.drawBoard(level);
    showBars('bar-hud', 'bar-controls');
    setLevelLabel(`${level.chapter}-${level.order} ${level.title}`);
    setMappingLabel(`映射：${MAPPING_NAMES[this.state.mapping]}`);
    setMoveCount(0);
    setTargetMoves(level.parMoves);
    this.showLevelHint(false);
    this.syncEntityStates(this.state);
    this.bindInputs();

    // 遥测：关卡开始
    recordEvent('level_start', level.id, 0);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hintRestoreTimer?.remove(false);
      this.hintRestoreTimer = null;
      setHintDirection(null);
      for (const fn of this.cleanupFns) fn();
      this.cleanupFns = [];
    });
  }

  private drawBoard(level: LevelRecord): void {
    const { width, height } = level.grid;
    this.tile = Math.min(
      Math.floor((BOARD_SIZE - 24) / width),
      Math.floor((BOARD_SIZE - 24) / height),
      64
    );
    this.originX = Math.floor((BOARD_SIZE - this.tile * width) / 2);
    this.originY = Math.floor((BOARD_SIZE - this.tile * height) / 2);
    const scale = this.tile / 64;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const c = this.cellCenter({ x, y });
        this.add.image(c.x, c.y, 'tile').setScale(scale);
      }
    }
    for (const wall of level.walls) {
      const c = this.cellCenter(wall);
      this.add.image(c.x, c.y, 'wall').setScale(scale);
    }

    for (const entity of level.entities) {
      const c = this.cellCenter(entity);
      switch (entity.type) {
        case 'plate':
          this.plateSprites.push({
            sprite: this.add.image(c.x, c.y, 'plate').setScale(scale),
            x: entity.x,
            y: entity.y
          });
          break;
        case 'pauseTile':
          this.add.image(c.x, c.y, 'pausetile').setScale(scale);
          break;
        case 'switcher':
          this.add.image(c.x, c.y, SWITCHER_TEXTURES[entity.target]).setScale(scale);
          break;
        case 'door':
          this.doorSprites.set(entity.id, this.add.image(c.x, c.y, 'door-closed').setScale(scale));
          break;
        case 'colorDoor':
          this.add
            .image(c.x, c.y, entity.color === 'BLUE' ? 'colordoor-blue' : 'colordoor-orange')
            .setScale(scale);
          break;
        case 'oneWay':
          this.add.image(c.x, c.y, ONEWAY_TEXTURES[entity.arrow]).setScale(scale);
          break;
        case 'portal':
          this.add.image(c.x, c.y, 'portal').setScale(scale);
          break;
        case 'fragile':
          this.fragileSprites.push({
            sprite: this.add.image(c.x, c.y, 'fragile').setScale(scale),
            x: entity.x,
            y: entity.y
          });
          break;
        case 'pulseSwitch':
          this.pulseSwitchSprites.push({
            sprite: this.add.image(c.x, c.y, 'pulseswitch').setScale(scale),
            x: entity.x,
            y: entity.y
          });
          break;
        case 'pulseDoor':
          this.pulseDoorSprites.push({
            sprite: this.add.image(c.x, c.y, 'pulsedoor-closed').setScale(scale),
            pairId: entity.pairId
          });
          break;
        default:
          break;
      }
    }

    this.exitBaseScale = (this.tile * 0.92) / 64;
    const blueExitCenter = this.cellCenter(level.blueExit);
    this.blueExit = this.add
      .image(blueExitCenter.x, blueExitCenter.y, 'exit-blue')
      .setScale(this.exitBaseScale)
      .setAlpha(0.85);
    const orangeExitCenter = this.cellCenter(level.orangeExit);
    this.orangeExit = this.add
      .image(orangeExitCenter.x, orangeExitCenter.y, 'exit-orange')
      .setScale(this.exitBaseScale)
      .setAlpha(0.85);

    const actorScale = (this.tile * 0.78) / 64;
    const blueCenter = this.cellCenter(level.blueStart);
    this.blueActor = this.add.image(blueCenter.x, blueCenter.y, 'actor-blue').setScale(actorScale);
    const orangeCenter = this.cellCenter(level.orangeStart);
    this.orangeActor = this.add
      .image(orangeCenter.x, orangeCenter.y, 'actor-orange')
      .setScale(actorScale);
    this.refreshExitGlow();
  }

  private cellCenter(p: Point): { x: number; y: number } {
    return {
      x: this.originX + (p.x + 0.5) * this.tile,
      y: this.originY + (p.y + 0.5) * this.tile
    };
  }

  private bindInputs(): void {
    const keyboard = this.input.keyboard;
    if (keyboard) {
      for (const [code, dir] of KEY_DIRECTIONS) {
        const key = keyboard.addKey(code);
        const handler = (): void => this.handleDirection(dir);
        key.on('down', handler);
        this.cleanupFns.push(() => key.off('down', handler));
        this.cleanupFns.push(() => keyboard.removeKey(key));
      }
    }

    // 滑动方向预览：指针按下时记录位置
    const onPointerDown = (pointer: Phaser.Input.Pointer): void => {
      this.pointerDownPos = { x: pointer.x, y: pointer.y };
      this.pointerDownTime = this.time.now;
    };
    this.input.on('pointerdown', onPointerDown);
    this.cleanupFns.push(() => this.input.off('pointerdown', onPointerDown));

    // 滑动方向预览：移动时显示方向
    const onPointerMove = (pointer: Phaser.Input.Pointer): void => {
      if (!this.pointerDownPos) return;
      if (this.time.now - this.pointerDownTime < DIR_PREVIEW_MIN_MS) return;
      const dx = pointer.x - this.pointerDownPos.x;
      const dy = pointer.y - this.pointerDownPos.y;
      const dir = swipeToDirection(dx, dy, 15);
      if (dir) {
        showDirectionPreview(dir);
      } else {
        hideDirectionPreview();
      }
    };
    this.input.on('pointermove', onPointerMove);
    this.cleanupFns.push(() => this.input.off('pointermove', onPointerMove));

    // 滑动方向预览：释放时
    const onPointerUp = (pointer: Phaser.Input.Pointer): void => {
      hideDirectionPreview();
      if (this.pointerDownPos) {
        const dx = pointer.upX - this.pointerDownPos.x;
        const dy = pointer.upY - this.pointerDownPos.y;
        const dir = swipeToDirection(dx, dy);
        if (dir) this.handleDirection(dir);
      }
      this.pointerDownPos = null;
    };
    this.input.on('pointerup', onPointerUp);
    this.cleanupFns.push(() => this.input.off('pointerup', onPointerUp));

    for (const [id, dir] of DIR_BUTTONS) {
      this.cleanupFns.push(bindButton(id, () => this.handleDirection(dir)));
    }
    this.cleanupFns.push(bindButton('btn-undo', () => this.handleUndo()));
    this.cleanupFns.push(bindButton('btn-restart', () => this.handleRestart()));
    this.cleanupFns.push(bindButton('btn-hint', () => this.showLevelHint(true)));
    this.cleanupFns.push(
      bindButton('btn-home', () => {
        audioManager.play('uiTap');
        recordEvent('quit', this.level?.id ?? '', this.state?.moveCount ?? 0);
        this.scene.start('Home');
      })
    );
  }

  private handleDirection(dir: Direction): void {
    const level = this.level;
    const state = this.state;
    if (!level || !state || this.wonLocked) return;
    const now = this.time.now;
    if (!this.gate.canAccept(now)) return;

    const mappingBefore = state.mapping;
    const collapsedBefore = state.fragileCollapsed.length;
    const pulseBefore = { ...state.pulseDoors };
    const { state: next, result } = applyCommand(level, state, dir);
    if (!result.applied) {
      audioManager.play('cancel');
      this.feedbackCancel();
      recordEvent('invalid', level.id, state.moveCount, dir);
      return;
    }
    this.state = next;
    this.gate.lock(now, this.reducedAnim ? 30 : MOVE_ANIM_MS);
    setMoveCount(next.moveCount);
    recordEvent('move', level.id, next.moveCount, dir);
    this.animateTurn(result, dir, mappingBefore, collapsedBefore, pulseBefore);
  }

  private animateTurn(
    result: ReturnType<typeof applyCommand>['result'],
    input: Direction,
    mappingBefore: MappingMode,
    collapsedBefore: number,
    pulseBefore: Record<string, boolean>
  ): void {
    const animDuration = this.reducedAnim ? 30 : MOVE_ANIM_MS;

    // 播放音效
    if (result.teleported.blue || result.teleported.orange) {
      audioManager.play('teleport');
    } else if (result.blue.blocked || result.orange.blocked) {
      audioManager.play('block');
    } else {
      audioManager.play('move');
    }

    if (this.blueActor)
      this.animateActor(this.blueActor, result.blue, input, result.teleported.blue, animDuration);
    if (this.orangeActor) {
      this.animateActor(
        this.orangeActor,
        result.orange,
        input,
        result.teleported.orange,
        animDuration
      );
    }

    const delay = animDuration + 30;
    this.time.delayedCall(delay, () => {
      const state = this.state;
      const level = this.level;
      if (!state || !level) return;
      this.refreshExitGlow();
      this.syncEntityStates(state);
      this.syncTokens(state);
      const events: string[] = [];
      if (result.teleported.blue) events.push('蓝被传送');
      if (result.teleported.orange) events.push('橙被传送');
      if (result.blue.blocked && result.blue.reason !== 'oneWay') {
        events.push('蓝被障碍挡住，橙仍会照常行动');
      }
      if (result.orange.blocked && result.orange.reason !== 'oneWay') {
        events.push('橙被障碍挡住，蓝仍会照常行动');
      }
      if (state.fragileCollapsed.length > collapsedBefore) {
        events.push('脆弱格坍塌');
        audioManager.play('collapse');
      }
      if (Object.keys(state.pulseDoors).some((k) => state.pulseDoors[k] && !pulseBefore[k])) {
        events.push('同步脉冲达成，脉冲门开启');
        audioManager.play('pulse');
      }
      if (result.blue.reason === 'oneWay' || result.orange.reason === 'oneWay') {
        events.push('单向格只能顺箭头离开');
      } else if (result.blue.reason === 'pulseDoor' || result.orange.reason === 'pulseDoor') {
        events.push('脉冲门未激活');
      }
      if (result.pauseConsumed.blue) events.push('蓝消耗暂停令牌，原地停留');
      if (result.pauseConsumed.orange) events.push('橙消耗暂停令牌，原地停留');
      if (state.mapping !== mappingBefore) {
        setMappingLabel(`映射：${MAPPING_NAMES[state.mapping]}`);
        events.push(`映射切换为${MAPPING_NAMES[state.mapping]}`);
        audioManager.play('switch');
      }
      const blueOnExit = equalsPoint(state.actors.blue.pos, level.blueExit);
      const orangeOnExit = equalsPoint(state.actors.orange.pos, level.orangeExit);
      if (blueOnExit !== orangeOnExit) {
        events.push(blueOnExit ? '蓝已到达出口，继续引导橙就位' : '橙已到达出口，继续引导蓝就位');
      }
      // 暂停令牌获得
      if (state.actors.blue.hasPauseToken && !result.pauseConsumed.blue) {
        const prev = this.state?.history?.[this.state.history.length - 1];
        if (prev && !prev.actors.blue.hasPauseToken) {
          audioManager.play('token');
        }
      }
      if (state.actors.orange.hasPauseToken && !result.pauseConsumed.orange) {
        const prev = this.state?.history?.[this.state.history.length - 1];
        if (prev && !prev.actors.orange.hasPauseToken) {
          audioManager.play('token');
        }
      }
      setStatusText(
        events.length > 0 ? events.join('；') : level.hint.focus,
        events.length ? 'event' : 'hint'
      );
      if (events.length > 0 && !result.won) this.scheduleHintRestore();
      if (result.won) this.winSequence();
    });
  }

  private animateActor(
    sprite: Phaser.GameObjects.Image,
    info: ActorMoveInfo,
    input: Direction,
    teleported: boolean,
    duration: number
  ): void {
    const toPx = this.cellCenter(info.to);
    if (teleported) {
      sprite.setPosition(toPx.x, toPx.y);
      sprite.setAlpha(0.35);
      if (!this.reducedAnim) {
        this.tweens.add({
          targets: sprite,
          alpha: 1,
          duration,
          ease: 'Quad.easeOut'
        });
      } else {
        sprite.setAlpha(1);
      }
      return;
    }
    if (info.blocked) {
      if (info.reason === 'oneWay') {
        if (!this.reducedAnim) {
          this.tweens.add({
            targets: sprite,
            x: sprite.x + 4,
            duration: duration / 4,
            yoyo: true,
            repeat: 1
          });
        }
        return;
      }
      const delta = DELTA[input];
      const bump = this.tile * 0.22;
      if (!this.reducedAnim) {
        this.tweens.add({
          targets: sprite,
          x: sprite.x + delta.x * bump,
          y: sprite.y + delta.y * bump,
          duration: duration / 2,
          yoyo: true,
          ease: 'Quad.easeOut'
        });
      }
      return;
    }
    if (!this.reducedAnim) {
      this.tweens.add({
        targets: sprite,
        x: toPx.x,
        y: toPx.y,
        duration,
        ease: 'Quad.easeOut'
      });
    } else {
      sprite.setPosition(toPx.x, toPx.y);
    }
  }

  /** 同格取消（R-04）反馈：双方短促抖动，不消耗步数。 */
  private feedbackCancel(): void {
    if (this.reducedAnim) return;
    for (const sprite of [this.blueActor, this.orangeActor]) {
      if (!sprite) continue;
      this.tweens.add({
        targets: sprite,
        x: sprite.x + 4,
        duration: CANCEL_SHAKE_MS / 4,
        yoyo: true,
        repeat: 1
      });
    }
  }

  private refreshExitGlow(): void {
    const state = this.state;
    const level = this.level;
    if (!state || !level || !this.blueExit || !this.orangeExit) return;
    const blueOn = equalsPoint(state.actors.blue.pos, level.blueExit);
    const orangeOn = equalsPoint(state.actors.orange.pos, level.orangeExit);
    this.blueExit
      .setAlpha(blueOn ? 1 : 0.85)
      .setScale(blueOn ? this.exitBaseScale * 1.15 : this.exitBaseScale);
    this.orangeExit
      .setAlpha(orangeOn ? 1 : 0.85)
      .setScale(orangeOn ? this.exitBaseScale * 1.15 : this.exitBaseScale);
  }

  /** 实体表现一律由 GameState 驱动（门开闭不得只存在精灵上）。 */
  private syncEntityStates(state: GameState): void {
    for (const [doorId, sprite] of this.doorSprites) {
      sprite.setTexture(state.doors[doorId] ? 'door-open' : 'door-closed');
    }
    for (const plate of this.plateSprites) {
      const occupied =
        equalsPoint(state.actors.blue.pos, { x: plate.x, y: plate.y }) ||
        equalsPoint(state.actors.orange.pos, { x: plate.x, y: plate.y });
      plate.sprite.setAlpha(occupied ? 1 : 0.72);
    }
    for (const fragile of this.fragileSprites) {
      const collapsed = state.fragileCollapsed.some((p) =>
        equalsPoint(p, { x: fragile.x, y: fragile.y })
      );
      fragile.sprite.setTexture(collapsed ? 'fragile-collapsed' : 'fragile');
      fragile.sprite.setAlpha(collapsed ? 0.9 : 1);
    }
    for (const pulseDoor of this.pulseDoorSprites) {
      pulseDoor.sprite.setTexture(
        state.pulseDoors[pulseDoor.pairId] ? 'pulsedoor-open' : 'pulsedoor-closed'
      );
    }
    for (const pulseSwitch of this.pulseSwitchSprites) {
      const occupied =
        equalsPoint(state.actors.blue.pos, { x: pulseSwitch.x, y: pulseSwitch.y }) ||
        equalsPoint(state.actors.orange.pos, { x: pulseSwitch.x, y: pulseSwitch.y });
      pulseSwitch.sprite.setAlpha(occupied ? 1 : 0.72);
    }
  }

  /** 暂停令牌指示（M3）：跟随角色，位于格子右上角。 */
  private syncTokens(state: GameState): void {
    const sync = (
      token: Phaser.GameObjects.Image | null,
      hasToken: boolean,
      pos: Point
    ): Phaser.GameObjects.Image | null => {
      if (!hasToken) {
        token?.setVisible(false);
        return token;
      }
      const c = this.cellCenter(pos);
      const scale = (this.tile * 0.34) / 64;
      if (!token) {
        token = this.add.image(c.x, c.y, 'token').setScale(scale);
      }
      token
        .setPosition(c.x + this.tile * 0.3, c.y - this.tile * 0.3)
        .setScale(scale)
        .setVisible(true);
      return token;
    };
    this.blueToken = sync(this.blueToken, state.actors.blue.hasPauseToken, state.actors.blue.pos);
    this.orangeToken = sync(
      this.orangeToken,
      state.actors.orange.hasPauseToken,
      state.actors.orange.pos
    );
  }

  private handleUndo(): void {
    const state = this.state;
    const level = this.level;
    if (!state || !level || this.wonLocked) return;
    const { state: prev, undone } = undo(state);
    if (!undone) {
      audioManager.play('block');
      return;
    }
    this.state = prev;
    this.gate.reset();
    this.syncActors();
    this.syncEntityStates(prev);
    this.syncTokens(prev);
    setMappingLabel(`映射：${MAPPING_NAMES[prev.mapping]}`);
    setMoveCount(prev.moveCount);
    this.refreshExitGlow();
    this.showLevelHint(false);
    audioManager.play('uiTap');
    recordEvent('undo', level.id, prev.moveCount);
  }

  private handleRestart(): void {
    const level = this.level;
    if (!level || this.wonLocked) return;
    this.state = restart(level);
    this.gate.reset();
    this.syncActors();
    this.syncEntityStates(this.state);
    this.syncTokens(this.state);
    setMappingLabel(`映射：${MAPPING_NAMES[this.state.mapping]}`);
    setMoveCount(0);
    this.refreshExitGlow();
    this.showLevelHint(false);
    audioManager.play('uiTap');
    recordEvent('restart', level.id, 0);
  }

  private syncActors(): void {
    const state = this.state;
    if (!state || !this.blueActor || !this.orangeActor) return;
    this.tweens.killTweensOf(this.blueActor);
    this.tweens.killTweensOf(this.orangeActor);
    const bluePx = this.cellCenter(state.actors.blue.pos);
    const orangePx = this.cellCenter(state.actors.orange.pos);
    this.blueActor.setPosition(bluePx.x, bluePx.y).setAlpha(1);
    this.orangeActor.setPosition(orangePx.x, orangePx.y).setAlpha(1);
  }

  private winSequence(): void {
    const state = this.state;
    const level = this.level;
    if (!state || !level || this.wonLocked) return;
    this.wonLocked = true;

    recordEvent('complete', level.id, state.moveCount);

    const store = localStorageStore();
    persistSave(
      store,
      recordWin(loadSave(store), level.id, levelLinearIndex(level.id), state.moveCount)
    );

    audioManager.play('win');
    setStatusText('双出口同步达成！', 'event');

    if (!this.reducedAnim) {
      for (const sprite of [this.blueActor, this.orangeActor]) {
        if (!sprite) continue;
        this.tweens.add({
          targets: sprite,
          scale: sprite.scale * 1.25,
          duration: 180,
          yoyo: true,
          repeat: 1,
          ease: 'Sine.easeInOut'
        });
      }
    }

    this.time.delayedCall(WIN_DELAY_MS, () => {
      this.scene.start('Result', {
        levelId: level.id,
        moves: state.moveCount,
        par: level.parMoves,
        nextId: nextLevelId(level.id)
      });
    });
  }

  private showLevelHint(record = false): void {
    const level = this.level;
    if (!level) return;
    this.hintRestoreTimer?.remove(false);
    this.hintRestoreTimer = null;
    setStatusText(level.hint.focus, 'hint');
    setHintDirection(level.hint.direction);
    if (record) {
      audioManager.play('uiTap');
      recordEvent('hint', level.id, this.state?.moveCount ?? 0);
    }
  }

  private scheduleHintRestore(): void {
    this.hintRestoreTimer?.remove(false);
    this.hintRestoreTimer = this.time.delayedCall(2200, () => this.showLevelHint(false));
  }
}
