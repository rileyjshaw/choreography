import { useEffect, useRef, useState } from 'react';
import { setDemoTitle } from './lib/util';
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
document.addEventListener('keydown', event => {
	if (event.key === ' ') {
		window.isTrailsEnabled = !window.isTrailsEnabled;
	}
});

alert('Use arrow keys to navigate between demos. Click spacebar to toggle trails.');

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
			}
		}
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, []);

	return (
		<canvas
			ref={canvasRef}
			style={{
				width: '100dvw',
				height: '100dvh',
				display: 'block',
			}}
		/>
	);
}
