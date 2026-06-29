/** Instala módulos del motor en globalThis para juegos aún no refactorizados a imports directos. */
export function installGlobals(modules) {
	Object.assign(globalThis, modules);
}
