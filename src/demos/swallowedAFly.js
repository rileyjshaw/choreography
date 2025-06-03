import Dancer from '../lib/Dancer';
import SubscriptionGroup from '../lib/SubscriptionGroup';

const N_DOGS = 20;
const N_CATS = 30;
const N_MICE = 40;

// Create an extended Dancer class for animal behavior
class AnimalDancer extends Dancer {
	constructor(
		canvas,
		emoji,
		angleOffset,
		{
			maxSpeed = 2,
			acceleration = 0.05,
			minDistance = 60,
			repulsionStrength = 0.5,
			fleeStrength = 0.3,
			chaseStrength = 0.2,
		} = {}
	) {
		super(canvas);
		this.vx = 0;
		this.vy = 0;
		this.maxSpeed = maxSpeed;
		this.acceleration = acceleration;
		this.minDistance = minDistance;
		this.repulsionStrength = repulsionStrength;
		this.fleeStrength = fleeStrength;
		this.chaseStrength = chaseStrength;

		this.setupEmoji(emoji, 36, angleOffset, 36);
	}

	step(canvas) {
		// 1. FLEEING: Run away from the nearest attacker
		let nearestAttacker = this.findNearest('attacker');
		let repulsionX = 0;
		let repulsionY = 0;

		if (nearestAttacker) {
			const dx = nearestAttacker.point.x - this.x;
			const dy = nearestAttacker.point.y - this.y;
			const distance = nearestAttacker.distance;

			// Run away from the attacker (notice the negative signs compared to attraction)
			if (distance > 0) {
				const invDistance = 1 / distance;
				const dirX = -dx * invDistance; // Negative to move away
				const dirY = -dy * invDistance; // Negative to move away

				// Apply stronger fleeing force
				this.vx += dirX * this.fleeStrength;
				this.vy += dirY * this.fleeStrength;
			}
		}

		// 2. CHASING: Move towards the nearest target (prey)
		let nearestTarget = this.findNearest('target');

		if (nearestTarget) {
			const dx = nearestTarget.point.x - this.x;
			const dy = nearestTarget.point.y - this.y;
			const distance = nearestTarget.distance;

			// Move toward the target
			if (distance > 0) {
				const invDistance = 1 / distance;
				const dirX = dx * invDistance; // Positive to move toward
				const dirY = dy * invDistance; // Positive to move toward

				// Apply chase force
				this.vx += dirX * this.chaseStrength;
				this.vy += dirY * this.chaseStrength;
			}
		}

		// 3. REPULSION: From the nearest same-type agent
		const nearestSameType = this.findNearest('same');

		if (nearestSameType) {
			const dx = nearestSameType.point.x - this.x;
			const dy = nearestSameType.point.y - this.y;
			const distance = nearestSameType.distance;

			// Apply repulsion if closer than minimum distance
			if (distance < this.minDistance) {
				// The closer they are, the stronger the repulsion
				const repulsionFactor = (this.minDistance - distance) / this.minDistance;

				// Calculate repulsion direction and strength
				const invDistance = 1 / distance;
				const dirX = -dx * invDistance;
				const dirY = -dy * invDistance;

				repulsionX = dirX * repulsionFactor * this.repulsionStrength;
				repulsionY = dirY * repulsionFactor * this.repulsionStrength;
			}
		}

		// Add repulsion forces to velocity
		this.vx += repulsionX;
		this.vy += repulsionY;

		// Limit velocity
		const speedSquared = this.vx * this.vx + this.vy * this.vy;
		if (speedSquared > this.maxSpeed * this.maxSpeed) {
			const speedFactor = this.maxSpeed / Math.sqrt(speedSquared);
			this.vx *= speedFactor;
			this.vy *= speedFactor;
		}

		// Add a small random component to prevent getting stuck
		this.vx += (Math.random() - 0.5) * 0.1;
		this.vy += (Math.random() - 0.5) * 0.1;

		// Update position with current velocity
		this.x += this.vx;
		this.y += this.vy;

		// Boundary enforcement - limit to 80% of canvas, centered
		// Calculate play area bounds (80% of canvas)
		const leftBound = canvas.width * 0.1; // 10% margin from left
		const rightBound = canvas.width * 0.9; // 10% margin from right
		const topBound = canvas.height * 0.1; // 10% margin from top
		const bottomBound = canvas.height * 0.9; // 10% margin from bottom

		// Clamp positions to stay within the 80% play area
		this.x = Math.max(leftBound, Math.min(rightBound, this.x));
		this.y = Math.max(topBound, Math.min(bottomBound, this.y));

		// Update heading based on velocity for emoji rotation
		this.heading = this.getHeadingFromVelocity();
	}

	// Calculate heading from velocity
	getHeadingFromVelocity() {
		const vx = this.vx;
		const vy = this.vy;
		if (vx === 0 && vy === 0) return 0;
		return Math.atan2(vy, vx);
	}
}

export function start(canvas) {
	const bounds = {
		x: 0,
		y: 0,
		width: canvas.width,
		height: canvas.height,
	};

	// Create agents with different speeds - mice are fastest, then cats, then dogs
	const dogs = Array.from(
		{ length: N_DOGS },
		() =>
			new AnimalDancer(canvas, '🐕‍🦺', Math.PI, {
				maxSpeed: 1.5,
				minDistance: 60,
				repulsionStrength: 1.0,
				fleeStrength: 0.3,
				chaseStrength: 0.2,
			})
	);

	const cats = Array.from(
		{ length: N_CATS },
		() =>
			new AnimalDancer(canvas, '🐈', Math.PI, {
				maxSpeed: 2,
				minDistance: 60,
				repulsionStrength: 0.5,
				fleeStrength: 0.3,
				chaseStrength: 0.2,
			})
	);

	const mice = Array.from(
		{ length: N_MICE },
		() =>
			new AnimalDancer(canvas, '🐭', Math.PI / 2, {
				maxSpeed: 5,
				minDistance: 60,
				repulsionStrength: 0.35,
				fleeStrength: 0.3,
				chaseStrength: 0.2,
			})
	);

	const dogGroup = new SubscriptionGroup(dogs, bounds);
	const catGroup = new SubscriptionGroup(cats, bounds);
	const mouseGroup = new SubscriptionGroup(mice, bounds);

	dogs.forEach(agent => {
		agent.subscribe(dogGroup, 'same');
		agent.subscribe(catGroup, 'target');
	});

	cats.forEach(agent => {
		agent.subscribe(catGroup, 'same');
		agent.subscribe(dogGroup, 'attacker');
		agent.subscribe(mouseGroup, 'target');
	});

	mice.forEach(agent => {
		agent.subscribe(mouseGroup, 'same');
		agent.subscribe(catGroup, 'attacker');
	});

	const dancers = [...dogs, ...cats, ...mice];
	const subscriptionGroups = [dogGroup, catGroup, mouseGroup];

	// Function to update all subscription groups
	function updateSubscriptionGroups(canvas) {
		const canvasBounds = {
			width: canvas.width,
			height: canvas.height,
		};

		subscriptionGroups.forEach(group => {
			group.updateSpatialIndex(canvasBounds);
		});
	}

	function step(canvas) {
		// Update all subscription groups' spatial indices
		updateSubscriptionGroups(canvas);

		// Process all dancers
		for (let i = 0; i < dancers.length; i++) {
			dancers[i].step(canvas);
		}

		// Update history for all dancers
		for (let i = 0; i < dancers.length; i++) {
			dancers[i].updateHistory();
		}
	}

	function draw(canvas) {
		const ctx = canvas.getContext('2d');
		if (!window.isTrailsEnabled) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}

		// Draw all animals
		for (let i = 0; i < dogs.length; i++) {
			dogs[i].draw(ctx);
		}

		for (let i = 0; i < cats.length; i++) {
			cats[i].draw(ctx);
		}

		for (let i = 0; i < mice.length; i++) {
			mice[i].draw(ctx);
		}
	}

	function resize() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}

	window.addEventListener('resize', resize);
	resize(); // Initial resize

	let animationFrameId;
	function render() {
		step(canvas);
		draw(canvas);
		animationFrameId = requestAnimationFrame(render);
	}
	render();

	return function stop() {
		cancelAnimationFrame(animationFrameId);
		window.removeEventListener('resize', resize);
	};
}
