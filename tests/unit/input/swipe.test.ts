import { describe, expect, it } from 'vitest';
import { SWIPE_MIN_DISTANCE, swipeToDirection } from '../../../src/input/swipe';

describe('滑动归一化 → Direction（FR-02）', () => {
  it('四方向主轴滑动正确归一化', () => {
    expect(swipeToDirection(80, 0)).toBe('RIGHT');
    expect(swipeToDirection(-80, 0)).toBe('LEFT');
    expect(swipeToDirection(0, 60)).toBe('DOWN');
    expect(swipeToDirection(0, -60)).toBe('UP');
  });

  it('位移不足阈值不产生方向（一次手势最多一个方向）', () => {
    expect(swipeToDirection(10, 5)).toBeNull();
    expect(swipeToDirection(0, 0)).toBeNull();
    expect(swipeToDirection(SWIPE_MIN_DISTANCE - 1, 0)).toBeNull();
  });

  it('斜向滑动按主导轴归一化', () => {
    expect(swipeToDirection(30, 29)).toBe('RIGHT');
    expect(swipeToDirection(-30, 29)).toBe('LEFT');
    expect(swipeToDirection(29, 30)).toBe('DOWN');
    expect(swipeToDirection(29, -30)).toBe('UP');
  });

  it('主导轴相等时水平优先（确定性）', () => {
    expect(swipeToDirection(30, 30)).toBe('RIGHT');
    expect(swipeToDirection(-30, -30)).toBe('LEFT');
  });

  it('支持自定义阈值', () => {
    expect(swipeToDirection(15, 0, 10)).toBe('RIGHT');
    expect(swipeToDirection(9, 0, 10)).toBeNull();
  });
});
