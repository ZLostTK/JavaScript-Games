/** Nombres de eventos del bus central — prefijo por dominio. */
export const Events = {
	// Input
	INPUT_KEY_DOWN: 'input:key-down',
	INPUT_KEY_UP: 'input:key-up',
	INPUT_KEY_PRESSED: 'input:key-pressed',

	// Audio
	AUDIO_PLAY: 'audio:play',
	AUDIO_SYNTH: 'audio:synth',
	AUDIO_MUTE_TOGGLE: 'audio:mute-toggle',

	// Online
	ONLINE_HOST_READY: 'online:host-ready',
	ONLINE_CONNECTED: 'online:connected',
	ONLINE_DATA: 'online:data',
	ONLINE_DISCONNECT: 'online:disconnect',
	ONLINE_ERROR: 'online:error',

	ECS_COLLISION: 'ecs:collision',
	ECS_WALL_BOUNCE: 'ecs:wall-bounce',
	ANIMATION_REGISTER: 'animation:register',
	ANIMATION_UNREGISTER: 'animation:unregister',
	ANIMATION_SET_STATE: 'animation:set-state',
};

/** Mapeo de callbacks legacy de Online → eventos del bus. */
export const OnlineEventMap = {
	onHostReady: Events.ONLINE_HOST_READY,
	onConnected: Events.ONLINE_CONNECTED,
	onData: Events.ONLINE_DATA,
	onDisconnect: Events.ONLINE_DISCONNECT,
	onError: Events.ONLINE_ERROR,
};
