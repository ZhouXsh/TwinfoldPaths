import Phaser from 'phaser';
import type { ActorMoveInfo, Direction, GameState, Point } from '../domain/types';
import { applyCommand, restart, undo } from '../domain/engine';
import { createInitialState } from '../domain/level';
import { DELTA, equalsPoint } from '../domain/point';
import type { LevelRecord } from '../content/validate';
import { FIRST_LEVEL_ID, getLevelById, nextLevelId } from '../content/levels';
import { InputGate } from '../input/gate';
import { swipeToDirection } from '../input/swipe';
import { localStorageStore, loadSave, persistSave, recordWin } from '../persistence/save-store';
import { bindButton, setLevelLabel, setMoveCount, setStatusText, showBars } from './dom-ui';

/** 移动动画时长（阶段 06 要求 150–220ms）。 */
const MOVE_ANIM_MS = 180;
const CANCEL_SHAKE_MS = 120;
const WIN_DELAY_MS = 700;
const BOARD_SIZE = 360;

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

    this.drawBoard(level);
    showBars('bar-hud', 'bar-controls');
    setLevelLabel(`${level.chapter}-${level.order} ${level.title}`);
    setMoveCount(0);
    setStatusText(level.hint.focus);
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

    const { state: next, result } = applyCommand(level, state, dir);
    if (!result.applied) {
      this.feedbackCancel();
      return;
    }
    this.state = next;
    this.gate.lock(now, MOVE_ANIM_MS);
    setMoveCount(next.moveCount);
    this.animateTurn(result, dir);
  }

  private animateTurn(result: ReturnType<typeof applyCommand>['result'], input: Direction): void {
    if (this.blueActor)
      this.animateActor(this.blueActor, result.blue, input, result.teleported.blue);
    if (this.orangeActor) {
      this.animateActor(this.orangeActor, result.orange, input, result.teleported.orange);
    }
    this.time.delayedCall(MOVE_ANIM_MS + 30, () => {
      this.refreshExitGlow();
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
      return;
    }
    if (info.blocked) {
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

  private handleUndo(): void {
    const state = this.state;
    const level = this.level;
    if (!state || !level || this.wonLocked) return;
    const { state: prev, undone } = undo(state);
    if (!undone) return;
    this.state = prev;
    this.gate.reset();
    this.syncActors();
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
    this.blueActor.setPosition(bluePx.x, bluePx.y);
    this.orangeActor.setPosition(orangePx.x, orangePx.y);
  }

  private winSequence(): void {
    const state = this.state;
    const level = this.level;
    if (!state || !level || this.wonLocked) return;
    this.wonLocked = true;

    const store = localStorageStore();
    persistSave(store, recordWin(loadSave(store), level.id, level.order, state.moveCount));

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
