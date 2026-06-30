import { System } from '../ecs/System.js';
import { Tween } from '../components/Tween.js';

export class TweenSystem extends System {
	update(_dt) {
		if (typeof gsap === 'undefined') return;

		for (const id of this.world.query(Tween)) {
			const tw = this.world.getComponent(id, Tween);
			if (tw.tween || tw.paused) continue;

			const target = tw.target ?? this._resolveTarget(id);
			if (!target) continue;

			tw.tween = gsap.to(target, {
				...tw.props,
				duration: tw.duration,
				ease: tw.ease,
				delay: tw.delay,
				yoyo: tw.yoyo,
				repeat: tw.repeat,
				onComplete: () => {
					tw.tween = null;
					tw.onComplete?.();
				},
			});
		}
	}

	_resolveTarget(id) {
		const t = this.world.getComponent(id, import('../components/Transform.js').Transform);
		return t || null;
	}

	kill(id) {
		const tw = this.world.getComponent(id, Tween);
		if (tw?.tween) {
			tw.tween.kill();
			tw.tween = null;
		}
	}
}
