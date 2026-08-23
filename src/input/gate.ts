/**
 * 输入门：动画期间锁输入（丢弃而非排队）。
 * 阶段 06 决策：一条指令一个明确回合；排队会让动画与结算错位，锁输入更可预期。
 */
export class InputGate {
  private busyUntilMs = 0;

  lock(nowMs: number, durationMs: number): void {
    this.busyUntilMs = Math.max(this.busyUntilMs, nowMs + durationMs);
  }

  canAccept(nowMs: number): boolean {
    return nowMs >= this.busyUntilMs;
  }

  reset(): void {
    this.busyUntilMs = 0;
  }
}
