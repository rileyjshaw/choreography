import { useEffect, useRef, useState } from 'react';
import { setDemoTitle } from './lib/util';
import handleTouch from './lib/handleTouch';
import * as beesDemo from './demos/bees';
import * as rpsDemo from './demos/rockPaperScissors';
import * as trafficDemo from './demos/traffic';
import * as swallowedAFlyDemo from './demos/swallowedAFly';
import * as spaceGravityDemo from './demos/spaceGravity';

const BASE_URL = import.meta.env.BASE_URL;

const DEMOS = [
	{
		name: 'BUG LIFE',
		emoji: '🐝',
		background: `url('${BASE_URL}bg/bees.jpg') center/cover no-repeat fixed`,
		module: beesDemo,
	},
	{
		name: 'RPS',
		emoji: '✂️',
		background: `url('${BASE_URL}bg/rps.jpg') center/cover no-repeat fixed`,
		module: rpsDemo,
	},
	{
		name: 'TRAFFIC',
		emoji: '🚗',
		background: `url('${BASE_URL}bg/traffic.webp') repeat fixed`,
		module: trafficDemo,
	},
	{
		name: 'GREAT CHASE',
		emoji: '🐭',
		background: `url('${BASE_URL}bg/swallowed_a_fly.jpg') center/cover no-repeat fixed`,
		module: swallowedAFlyDemo,
	},
	{ name: 'SPACE', emoji: '👽', background: '#000', module: spaceGravityDemo },
];

window.isTrailsEnabled = false;

alert('Use arrow keys / swipe to navigate between demos. Click spacebar / double tap to toggle trails.');

export default function App() {
	const canvasRef = useRef(null);
	const [currentDemoIndex, setCurrentDemoIndex] = useState(0);
	const stopFunctionRef = useRef(null);

	useEffect(() => {
		const currentDemo = DEMOS[currentDemoIndex];
		setDemoTitle(currentDemo.name, currentDemo.emoji);
		document.body.style.background = currentDemo.background ?? 'none';
		stopFunctionRef.current = currentDemo.module.start(canvasRef.current);
		return () => {
			stopFunctionRef.current?.();
		};
	}, [currentDemoIndex]);

	useEffect(() => {
		function handleKeyDown(e) {
			if (e.code === 'ArrowRight') {
				setCurrentDemoIndex(prevIndex => (prevIndex + 1) % DEMOS.length);
			} else if (e.code === 'ArrowLeft') {
				setCurrentDemoIndex(prevIndex => (prevIndex - 1 + DEMOS.length) % DEMOS.length);
			} else if (e.code === 'Space') {
				window.isTrailsEnabled = !window.isTrailsEnabled;
			}
		}
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, []);

	useEffect(() => {
		let lastTap = 0;
		function handleTouchStart(e) {
			if (e.touches.length !== 1) {
				lastTap = 0;
				return;
			}

			const currentTime = new Date().getTime();
			const doubleTapDelay = currentTime - lastTap;
			if (doubleTapDelay < 500 && doubleTapDelay > 0) {
				window.isTrailsEnabled = !window.isTrailsEnabled;
			}
			lastTap = currentTime;
		}
		window.addEventListener('touchstart', handleTouchStart);

		return () => {
			window.removeEventListener('touchstart', handleTouchStart);
		};
	}, []);

	return (
		<div
			style={{ height: '100dvh', width: '100dvw', display: 'flex' }}
			ref={element => {
				if (!element) return;

				const cleanupFn = handleTouch(element, (direction, diff) => {
					if (direction === 'x') {
						if (diff > 0) {
							// Right swipe
							setCurrentDemoIndex(prevIndex => (prevIndex - 1 + DEMOS.length) % DEMOS.length);
						} else {
							// Left swipe
							setCurrentDemoIndex(prevIndex => (prevIndex + 1) % DEMOS.length);
						}
						return { skip: true }; // Only process one swipe at a time
					}
				});

				return cleanupFn;
			}}
		>
			<canvas ref={canvasRef} style={{ height: '100%', width: '100%' }} />
		</div>
	);
}
