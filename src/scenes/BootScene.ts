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

    // M1 压板：凹陷底盘 + 圆角踏板
    g.fillStyle(0x22303e);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0x51637a);
    g.fillRoundedRect(10, 10, S - 20, S - 20, 8);
    g.lineStyle(3, 0x7f93a8);
    g.strokeRoundedRect(10, 10, S - 20, S - 20, 8);
    g.generateTexture('plate', S, S);
    g.clear();

    // M1 门（关闭）：实体栅栏
    g.fillStyle(0x35424f);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0x9fb4c7);
    for (const bx of [12, 28, 44]) g.fillRect(bx, 6, 8, S - 12);
    g.lineStyle(3, 0x222b35);
    g.strokeRect(2, 2, S - 4, S - 4);
    g.generateTexture('door-closed', S, S);
    g.clear();

    // M1 门（开启）：地面 + 沉底边框（可通行）
    g.fillStyle(0x161d26);
    g.fillRect(0, 0, S, S);
    g.lineStyle(3, 0x3d4c5c);
    g.strokeRect(6, 6, S - 12, S - 12);
    g.fillStyle(0x3d4c5c);
    for (const bx of [14, 30, 46]) g.fillRect(bx, S - 12, 6, 6);
    g.generateTexture('door-open', S, S);
    g.clear();

    // M2 蓝专属门：方形（形状）+ 横纹（纹理）+ 蓝色（颜色）
    g.fillStyle(0x161d26);
    g.fillRect(0, 0, S, S);
    g.lineStyle(6, 0x4aa3ff);
    g.strokeRect(10, 10, S - 20, S - 20);
    g.lineStyle(3, 0x4aa3ff);
    g.lineBetween(16, 24, S - 16, 24);
    g.lineBetween(16, 32, S - 16, 32);
    g.lineBetween(16, 40, S - 16, 40);
    g.generateTexture('colordoor-blue', S, S);
    g.clear();

    // M2 橙专属门：菱形（形状）+ 斜纹（纹理）+ 橙色（颜色）
    g.fillStyle(0x161d26);
    g.fillRect(0, 0, S, S);
    const diamond = [
      { x: S / 2, y: 8 },
      { x: S - 8, y: S / 2 },
      { x: S / 2, y: S - 8 },
      { x: 8, y: S / 2 }
    ];
    g.lineStyle(6, 0xff9a3c);
    g.strokePoints(diamond, true, true);
    g.lineStyle(3, 0xff9a3c);
    g.lineBetween(22, 42, 42, 22);
    g.lineBetween(26, 50, 50, 26);
    g.generateTexture('colordoor-orange', S, S);
    g.clear();

    // M3 暂停格：地面 + 双竖条
    g.fillStyle(0x202b38);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0x9fb4c7);
    g.fillRect(22, 18, 7, 28);
    g.fillRect(35, 18, 7, 28);
    g.lineStyle(2, 0x33455a);
    g.strokeRect(1, 1, S - 2, S - 2);
    g.generateTexture('pausetile', S, S);
    g.clear();

    // M4 切换器（目标=垂直镜像）：↕ 双向箭头
    g.fillStyle(0x1c2f2c);
    g.fillRect(0, 0, S, S);
    g.lineStyle(2, 0x7fe0d0);
    g.strokeRect(4, 4, S - 8, S - 8);
    g.lineStyle(4, 0x7fe0d0);
    g.lineBetween(S / 2, 14, S / 2, S - 14);
    g.fillStyle(0x7fe0d0);
    g.fillPoints(
      [
        { x: S / 2, y: 8 },
        { x: S / 2 - 7, y: 19 },
        { x: S / 2 + 7, y: 19 }
      ],
      true
    );
    g.fillPoints(
      [
        { x: S / 2, y: S - 8 },
        { x: S / 2 - 7, y: S - 19 },
        { x: S / 2 + 7, y: S - 19 }
      ],
      true
    );
    g.generateTexture('switcher-V', S, S);
    g.clear();

    // M4 切换器（目标=水平镜像）：↔ 双向箭头
    g.fillStyle(0x1c2f2c);
    g.fillRect(0, 0, S, S);
    g.lineStyle(2, 0x7fe0d0);
    g.strokeRect(4, 4, S - 8, S - 8);
    g.lineStyle(4, 0x7fe0d0);
    g.lineBetween(14, S / 2, S - 14, S / 2);
    g.fillStyle(0x7fe0d0);
    g.fillPoints(
      [
        { x: 8, y: S / 2 },
        { x: 19, y: S / 2 - 7 },
        { x: 19, y: S / 2 + 7 }
      ],
      true
    );
    g.fillPoints(
      [
        { x: S - 8, y: S / 2 },
        { x: S - 19, y: S / 2 - 7 },
        { x: S - 19, y: S / 2 + 7 }
      ],
      true
    );
    g.generateTexture('switcher-H', S, S);
    g.clear();

    // M4 切换器（目标=顺时针旋转）：顺时针弧箭头
    g.fillStyle(0x1c2f2c);
    g.fillRect(0, 0, S, S);
    g.lineStyle(2, 0x7fe0d0);
    g.strokeRect(4, 4, S - 8, S - 8);
    g.lineStyle(4, 0x7fe0d0);
    g.beginPath();
    g.arc(S / 2, S / 2, 16, -Math.PI / 2, Math.PI, false);
    g.strokePath();
    g.fillStyle(0x7fe0d0);
    g.fillPoints(
      [
        { x: S / 2 - 22, y: S / 2 },
        { x: S / 2 - 8, y: S / 2 - 6 },
        { x: S / 2 - 8, y: S / 2 + 8 }
      ],
      true
    );
    g.generateTexture('switcher-R', S, S);
    g.clear();

    // M3 暂停令牌：圆形徽章 + 双竖条（颜色+形状+纹理）
    g.fillStyle(0xffd479);
    g.fillCircle(S / 2, S / 2, 20);
    g.lineStyle(4, 0x5c4a1e);
    g.strokeCircle(S / 2, S / 2, 20);
    g.fillStyle(0x5c4a1e);
    g.fillRect(24, 22, 6, 20);
    g.fillRect(34, 22, 6, 20);
    g.generateTexture('token', S, S);
    g.clear();

    g.destroy();
    this.scene.start('Home');
  }
}
