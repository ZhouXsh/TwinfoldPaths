import Phaser from 'phaser';

/** 程序化生成全部贴图（ADR-009/011：零外部资产）。 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const g = this.make.graphics({}, false);
    const S = 64;

    g.fillStyle(0x161d26);
    g.fillRect(0, 0, S, S);
    g.lineStyle(2, 0x232e3a);
    g.strokeRect(1, 1, S - 2, S - 2);
    g.generateTexture('tile', S, S);
    g.clear();

    g.fillStyle(0x3a4654);
    g.fillRect(0, 0, S, S);
    g.lineStyle(3, 0x222b35);
    g.strokeRect(2, 2, S - 4, S - 4);
    g.lineStyle(3, 0x2c3743);
    g.lineBetween(10, S - 10, S - 10, 10);
    g.generateTexture('wall', S, S);
    g.clear();

    g.lineStyle(5, 0x4aa3ff);
    g.strokeCircle(S / 2, S / 2, 20);
    g.generateTexture('exit-blue', S, S);
    g.clear();

    g.lineStyle(5, 0xff9a3c);
    g.strokePoints(
      [
        { x: S / 2, y: 8 },
        { x: S - 8, y: S / 2 },
        { x: S / 2, y: S - 8 },
        { x: 8, y: S / 2 }
      ],
      true,
      true
    );
    g.generateTexture('exit-orange', S, S);
    g.clear();

    g.fillStyle(0x4aa3ff);
    g.fillCircle(S / 2, S / 2, 22);
    g.lineStyle(3, 0xbfe0ff);
    g.strokeCircle(S / 2, S / 2, 22);
    g.generateTexture('actor-blue', S, S);
    g.clear();

    g.fillStyle(0xff9a3c);
    g.fillPoints(
      [
        { x: S / 2, y: 5 },
        { x: S - 5, y: S / 2 },
        { x: S / 2, y: S - 5 },
        { x: 5, y: S / 2 }
      ],
      true,
      true
    );
    g.lineStyle(3, 0xffd9ad);
    g.strokePoints(
      [
        { x: S / 2, y: 5 },
        { x: S - 5, y: S / 2 },
        { x: S / 2, y: S - 5 },
        { x: 5, y: S / 2 }
      ],
      true,
      true
    );
    g.generateTexture('actor-orange', S, S);
    g.clear();

    g.destroy();
    this.scene.start('Home');
  }
}
