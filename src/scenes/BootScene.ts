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

    // M5 单向格：底色 + 箭头形状即方向编码（四向各一张）
    const drawOneWay = (key: string, dx: number, dy: number): void => {
      g.fillStyle(0x232338);
      g.fillRect(0, 0, S, S);
      g.lineStyle(2, 0x5a5f8a);
      g.strokeRect(1, 1, S - 2, S - 2);
      const cx = S / 2;
      const cy = S / 2;
      const px = -dy;
      const py = dx;
      g.lineStyle(6, 0xa8d94e);
      g.lineBetween(cx - dx * 16, cy - dy * 16, cx + dx * 6, cy + dy * 6);
      g.fillStyle(0xa8d94e);
      g.fillPoints(
        [
          { x: cx + dx * 20, y: cy + dy * 20 },
          { x: cx + dx * 2 + px * 10, y: cy + dy * 2 + py * 10 },
          { x: cx + dx * 2 - px * 10, y: cy + dy * 2 - py * 10 }
        ],
        true
      );
      g.generateTexture(key, S, S);
      g.clear();
    };
    drawOneWay('oneway-UP', 0, -1);
    drawOneWay('oneway-DOWN', 0, 1);
    drawOneWay('oneway-LEFT', -1, 0);
    drawOneWay('oneway-RIGHT', 1, 0);

    // M6 传送门：圆环 + 内旋弧 + 中心点
    g.fillStyle(0x101c24);
    g.fillRect(0, 0, S, S);
    g.lineStyle(5, 0x59e3ff);
    g.strokeCircle(S / 2, S / 2, 21);
    g.lineStyle(3, 0x2ea8c4);
    g.beginPath();
    g.arc(S / 2, S / 2, 12, -Math.PI / 3, Math.PI, false);
    g.strokePath();
    g.fillStyle(0xbdf3ff);
    g.fillCircle(S / 2, S / 2, 4);
    g.generateTexture('portal', S, S);
    g.clear();

    // M7 脆弱格：暖底色 + 裂纹
    g.fillStyle(0x3a3226);
    g.fillRect(0, 0, S, S);
    g.lineStyle(2, 0x9c8a6a);
    g.lineBetween(12, 10, 26, 28);
    g.lineBetween(26, 28, 18, 46);
    g.lineBetween(26, 28, 44, 36);
    g.lineBetween(44, 36, 52, 18);
    g.lineBetween(44, 36, 50, 52);
    g.lineStyle(2, 0x221d14);
    g.strokeRect(1, 1, S - 2, S - 2);
    g.generateTexture('fragile', S, S);
    g.clear();

    // M7 脆弱格（已坍塌）：暗坑 + 碎屑
    g.fillStyle(0x0d1117);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0x2a323c);
    g.fillRect(12, 40, 10, 8);
    g.fillRect(34, 44, 12, 7);
    g.fillRect(24, 20, 8, 7);
    g.fillRect(42, 24, 7, 6);
    g.lineStyle(2, 0x1c232c);
    g.strokeRect(1, 1, S - 2, S - 2);
    g.generateTexture('fragile-collapsed', S, S);
    g.clear();

    // M8 脉冲开关：圆形按钮 + 外环
    g.fillStyle(0x241722);
    g.fillRect(0, 0, S, S);
    g.lineStyle(2, 0x5a3350);
    g.strokeRect(1, 1, S - 2, S - 2);
    g.lineStyle(2, 0x8a2f57);
    g.strokeCircle(S / 2, S / 2, 21);
    g.fillStyle(0xff5fa2);
    g.fillCircle(S / 2, S / 2, 14);
    g.lineStyle(3, 0xffc2da);
    g.strokeCircle(S / 2, S / 2, 14);
    g.generateTexture('pulseswitch', S, S);
    g.clear();

    // M8 脉冲门（未激活）：实体栅栏（品红）
    g.fillStyle(0x2b1a24);
    g.fillRect(0, 0, S, S);
    g.fillStyle(0xff5fa2);
    for (const bx of [12, 28, 44]) g.fillRect(bx, 6, 8, S - 12);
    g.lineStyle(3, 0x22101c);
    g.strokeRect(2, 2, S - 4, S - 4);
    g.generateTexture('pulsedoor-closed', S, S);
    g.clear();

    // M8 脉冲门（已激活）：地面 + 沉底边框（可通行）
    g.fillStyle(0x161d26);
    g.fillRect(0, 0, S, S);
    g.lineStyle(3, 0x8a2f57);
    g.strokeRect(6, 6, S - 12, S - 12);
    g.fillStyle(0x8a2f57);
    for (const bx of [14, 30, 46]) g.fillRect(bx, S - 12, 6, 6);
    g.generateTexture('pulsedoor-open', S, S);
    g.clear();

    g.destroy();
    this.scene.start('Home');
  }
}
