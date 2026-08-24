import Phaser from 'phaser';
import type { ActorMoveInfo, Direction, GameState, MappingMode, Point } from '../domain/types';
import { applyCommand, restart, undo } from '../domain/engine';
import { createInitialState } from '../domain/level';
import { DELTA, equalsPoint } from '../domain/point';
import type { LevelRecord } from '../content/validate';
import { FIRST_LEVEL_ID, getLevelById, levelLinearIndex, nextLevelId } from '../content/levels';
import { InputGate } from '../input/gate';
import { swipeToDirection } from '../input/swipe';
import { localStorageStore, loadSave, persistSave, recordWin } from '../persistence/save-store';
import {
  bindButton,
  setLevelLabel,
  setMappingLabel,
  setMoveCount,
  setStatusText,
  showBars
} from './dom-ui';

/** 移动动画时长（阶段 06 要求 150–220ms）。 */
const MOVE_ANIM_MS = 180;
const CANCEL_SHAKE_MS = 120;
const WIN_DELAY_MS = 700;
const BOARD_SIZE = 360;

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

    this.drawBoard(level);
    showBars('bar-hud', 'bar-controls');
    setLevelLabel(`${level.chapter}-${level.order} ${level.title}`);
    setMappingLabel(`映射：${MAPPING_NAMES[this.state.mapping]}`);
    setMoveCount(0);
    setStatusText(level.hint.focus);
    this.syncEntityStates(this.state);
    this.bindInputs();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
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

    const onPointerUp = (pointer: Phaser.Input.Pointer): void => {
      const dir = swipeToDirection(pointer.upX - pointer.downX, pointer.upY - pointer.downY);
      if (dir) this.handleDirection(dir);
    };
    this.input.on('pointerup', onPointerUp);
    this.cleanupFns.push(() => this.input.off('pointerup', onPointerUp));

    for (const [id, dir] of DIR_BUTTONS) {
      this.cleanupFns.push(bindButton(id, () => this.handleDirection(dir)));
    }
    this.cleanupFns.push(bindButton('btn-undo', () => this.handleUndo()));
    this.cleanupFns.push(bindButton('btn-restart', () => this.handleRestart()));
    this.cleanupFns.push(bindButton('btn-home', () => this.scene.start('Home')));
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
      this.feedbackCancel();
      return;
    }
    this.state = next;
    this.gate.lock(now, MOVE_ANIM_MS);
    setMoveCount(next.moveCount);
    this.animateTurn(result, dir, mappingBefore, collapsedBefore, pulseBefore);
  }

  private animateTurn(
    result: ReturnType<typeof applyCommand>['result'],
    input: Direction,
    mappingBefore: MappingMode,
    collapsedBefore: number,
    pulseBefore: Record<string, boolean>
  ): void {
    if (this.blueActor)
      this.animateActor(this.blueActor, result.blue, input, result.teleported.blue);
    if (this.orangeActor) {
      this.animateActor(this.orangeActor, result.orange, input, result.teleported.orange);
    }
    this.time.delayedCall(MOVE_ANIM_MS + 30, () => {
      const state = this.state;
      const level = this.level;
      if (!state || !level) return;
      this.refreshExitGlow();
      this.syncEntityStates(state);
      this.syncTokens(state);
      const events: string[] = [];
      if (result.teleported.blue) events.push('蓝被传送');
      if (result.teleported.orange) events.push('橙被传送');
      if (state.fragileCollapsed.length > collapsedBefore) events.push('脆弱格坍塌');
      if (Object.keys(state.pulseDoors).some((k) => state.pulseDoors[k] && !pulseBefore[k])) {
        events.push('同步脉冲达成，脉冲门开启');
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
      }
      setStatusText(events.length > 0 ? events.join('；') : level.hint.focus);
      if (result.won) this.winSequence();
    });
  }

  private animateActor(
    sprite: Phaser.GameObjects.Image,
    info: ActorMoveInfo,
    input: Direction,
    teleported: boolean
  ): void {
    const toPx = this.cellCenter(info.to);
    if (teleported) {
      sprite.setPosition(toPx.x, toPx.y);
      sprite.setAlpha(0.35);
      this.tweens.add({
        targets: sprite,
        alpha: 1,
        duration: MOVE_ANIM_MS,
        ease: 'Quad.easeOut'
      });
      return;
    }
    if (info.blocked) {
      if (info.reason === 'oneWay') {
        // M5：单向格阻挡反馈与墙不同——原地短促左右抖动（不朝输入方向冲撞）
        this.tweens.add({
          targets: sprite,
          x: sprite.x + 4,
          duration: MOVE_ANIM_MS / 4,
          yoyo: true,
          repeat: 1
        });
        return;
      }
      const delta = DELTA[input];
      const bump = this.tile * 0.22;
      this.tweens.add({
        targets: sprite,
        x: sprite.x + delta.x * bump,
        y: sprite.y + delta.y * bump,
        duration: MOVE_ANIM_MS / 2,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
      return;
    }
    this.tweens.add({
      targets: sprite,
      x: toPx.x,
      y: toPx.y,
      duration: MOVE_ANIM_MS,
      ease: 'Quad.easeOut'
    });
  }

  /** 同格取消（R-04）反馈：双方短促抖动，不消耗步数。 */
  private feedbackCancel(): void {
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
    if (!undone) return;
    this.state = prev;
    this.gate.reset();
    this.syncActors();
    this.syncEntityStates(prev);
    this.syncTokens(prev);
    setMappingLabel(`映射：${MAPPING_NAMES[prev.mapping]}`);
    setMoveCount(prev.moveCount);
    this.refreshExitGlow();
    setStatusText(level.hint.focus);
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
    setStatusText(level.hint.focus);
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

    const store = localStorageStore();
    persistSave(
      store,
      recordWin(loadSave(store), level.id, levelLinearIndex(level.id), state.moveCount)
    );

    setStatusText('双出口同步达成！');
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
    this.time.delayedCall(WIN_DELAY_MS, () => {
      this.scene.start('Result', {
        levelId: level.id,
        moves: state.moveCount,
        par: level.parMoves,
        nextId: nextLevelId(level.id)
      });
    });
  }
}
