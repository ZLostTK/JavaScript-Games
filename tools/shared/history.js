const MAX_HISTORY = 50;

export class History {
  constructor(snapshotFn, applyFn) {
    this.snapshot = snapshotFn;
    this.apply = applyFn;
    this.stack = [];
    this.index = -1;
  }

  init() {
    this.stack = [this.snapshot()];
    this.index = 0;
  }

  push() {
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(this.snapshot());
    if (this.stack.length > MAX_HISTORY) {
      this.stack.shift();
    } else {
      this.index++;
    }
  }

  undo() {
    if (this.index <= 0) return false;
    this.index--;
    this.apply(this.stack[this.index]);
    return true;
  }

  redo() {
    if (this.index >= this.stack.length - 1) return false;
    this.index++;
    this.apply(this.stack[this.index]);
    return true;
  }

  get canUndo() {
    return this.index > 0;
  }

  get canRedo() {
    return this.index < this.stack.length - 1;
  }
}
