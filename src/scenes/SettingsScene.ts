/** 设置场景：管理音效、音乐、振动、弱化动画开关，通过 DOM 实现。 */
import Phaser from 'phaser';
import {
  localStorageStore,
  loadSettings,
  persistSettings,
  defaultSettings,
  type SaveSettings
} from '../persistence/save-store';
import { audioManager } from '../audio/audio-manager';
import { bindButton, getEl, showBars } from './dom-ui';

export class SettingsScene extends Phaser.Scene {
  private cleanupFns: Array<() => void> = [];
  private settings: SaveSettings = defaultSettings();

  constructor() {
    super('Settings');
  }

  create(): void {
    showBars('bar-settings');
    this.settings = loadSettings(localStorageStore());
    audioManager.setState({ music: this.settings.music, sfx: this.settings.sfx });
    this.renderSettings();
    this.cleanupFns.push(bindButton('btn-settings-back', () => this.scene.start('Home')));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const fn of this.cleanupFns) fn();
      this.cleanupFns = [];
    });
  }

  private renderSettings(): void {
    const container = getEl('settings-group');
    container.innerHTML = '';

    const items: Array<{
      id: keyof SaveSettings;
      label: string;
      desc: string;
    }> = [
      { id: 'music', label: '背景音乐', desc: '开启/关闭背景音乐' },
      { id: 'sfx', label: '音效', desc: '移动、机关、通关等音效' },
      { id: 'vibration', label: '振动', desc: '操作时的触觉反馈' },
      { id: 'reducedAnim', label: '弱化动画', desc: '减少动画效果，提升操作响应' }
    ];

    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'settings-row';

      const label = document.createElement('div');
      label.className = 'settings-label';
      label.textContent = item.label;

      const desc = document.createElement('div');
      desc.className = 'settings-desc';
      desc.textContent = item.desc;

      const labelGroup = document.createElement('div');
      labelGroup.style.flex = '1';
      labelGroup.appendChild(label);
      labelGroup.appendChild(desc);

      const toggle = document.createElement('button');
      toggle.className = `toggle-switch ${this.settings[item.id] ? 'on' : ''}`;
      toggle.setAttribute(
        'aria-label',
        `${item.label} ${this.settings[item.id] ? '开启' : '关闭'}`
      );
      toggle.setAttribute('role', 'switch');
      toggle.setAttribute('aria-checked', String(this.settings[item.id]));
      toggle.addEventListener('click', () => {
        this.settings[item.id] = !this.settings[item.id];
        toggle.className = `toggle-switch ${this.settings[item.id] ? 'on' : ''}`;
        toggle.setAttribute('aria-checked', String(this.settings[item.id]));
        toggle.setAttribute(
          'aria-label',
          `${item.label} ${this.settings[item.id] ? '开启' : '关闭'}`
        );
        this.saveSettings();
        if (item.id === 'sfx') {
          audioManager.setState({ music: this.settings.music, sfx: this.settings.sfx });
          if (this.settings.sfx) audioManager.play('uiTap');
        }
        if (item.id === 'music') {
          audioManager.setState({ music: this.settings.music, sfx: this.settings.sfx });
        }
      });

      row.appendChild(labelGroup);
      row.appendChild(toggle);
      container.appendChild(row);
    }
  }

  private saveSettings(): void {
    const store = localStorageStore();
    persistSettings(store, this.settings);
  }
}
