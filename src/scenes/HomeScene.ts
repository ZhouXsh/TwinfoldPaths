import Phaser from 'phaser';

const STATUS_ID = 'status';
const STATUS_OK = '健康检查 OK';

export class HomeScene extends Phaser.Scene {
  constructor() {
    super('Home');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height * 0.35, '双生折线', {
        fontSize: '40px',
        color: '#e8f1f8'
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.43, 'Twinfold Paths', {
        fontSize: '18px',
        color: '#9fb4c7'
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.58, STATUS_OK, {
        fontSize: '20px',
        color: '#7fe0a7'
      })
      .setOrigin(0.5);

    const el = document.getElementById(STATUS_ID);
    if (el) {
      el.textContent = STATUS_OK;
    }
  }
}
