/** One step per continuous gesture, including momentum after animation ends. */
export class ScrollIntent {
  private last = -Infinity;
  private total = 0;
  private consumed = false;
  constructor(
    readonly threshold = 40,
    readonly quietMs = 180,
  ) {}
  reset(consumed = false) {
    this.last = -Infinity;
    this.total = 0;
    this.consumed = consumed;
  }
  feed(delta: number, now: number, busy: boolean, touch = false): -1 | 0 | 1 {
    if (!touch && now - this.last >= this.quietMs) {
      this.total = 0;
      this.consumed = false;
    }
    this.last = now;
    if (busy) {
      this.consumed = true;
      return 0;
    }
    if (this.consumed || !Number.isFinite(delta)) return 0;
    if (Math.sign(delta) !== Math.sign(this.total)) this.total = 0;
    this.total += delta;
    if (Math.abs(this.total) < this.threshold) return 0;
    this.consumed = true;
    return this.total > 0 ? 1 : -1;
  }
}
