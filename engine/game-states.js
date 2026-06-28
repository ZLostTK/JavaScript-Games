/** Mini manejador de estados - elimina switch(this.state) duplicado en update/render */
class GameStates {
  constructor(states, initial, ctx = null) {
    this._states = states;
    this._ctx = ctx;
    this._name = initial ?? Object.keys(states)[0];
    this._initialized = false;
  }

  bind(ctx) {
    this._ctx = ctx;
    return this;
  }

  get() {
    return this._name;
  }

  is(name) {
    return this._name === name;
  }

  has(name) {
    return name in this._states;
  }

  set(name, ...args) {
    if (!this._states[name]) {
      console.warn(`GameStates: estado desconocido "${name}"`);
      return this;
    }

    const prev = this._states[this._name];
    if (prev?.exit) prev.exit.apply(this._ctx);

    this._name = name;
    this._initialized = false;

    const next = this._states[name];
    if (next?.init) {
      next.init.apply(this._ctx, args);
      this._initialized = true;
    }

    return this;
  }

  update(dt) {
    const state = this._states[this._name];
    if (!state) return;

    if (!this._initialized && state.init) {
      state.init.call(this._ctx);
      this._initialized = true;
    }

    if (state.update) state.update.call(this._ctx, dt);
  }

  render(ctx) {
    const state = this._states[this._name];
    if (state?.render) state.render.call(this._ctx, ctx);
  }

  /** Atajo: update + render en un solo paso (útil en render personalizado) */
  run(dt, ctx) {
    this.update(dt);
    if (ctx !== undefined) this.render(ctx);
  }
}
