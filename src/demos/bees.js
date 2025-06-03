import Dancer from '../lib/Dancer';
import SubscriptionGroup from '../lib/SubscriptionGroup';

const FLOWERS = ['🌸', '🌼', '🌺'];

class Flower extends Dancer {
	constructor(canvas, speed = 3, maxTurnRate = 0.1) {
		super(canvas);
		this.speed = speed;
		this.heading = Math.random() * Math.PI * 2;
		this.maxTurnRate = maxTurnRate;
		this.targetHeading = this.heading;
		this.angularVelocity = 0;
		this.angularAcceleration = 0.001;
		this.angularDamping = 0.95; // Damping factor to prevent excessive oscillation.
		this.targetChangeFrequency = 0.02; // Probability of changing target direction.
		this.setupEmoji(FLOWERS[Math.floor(Math.random() * FLOWERS.length)], 36, 0, 36);
	}

	step(canvas) {
		// Occasionally change target heading.
		if (Math.random() < this.targetChangeFrequency) {
			this.targetHeading = Math.random() * Math.PI * 2;
		}

		let angleDifference = this.targetHeading - this.heading;
		angleDifference = ((angleDifference + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;

		// Apply angular acceleration toward the target heading
		this.angularVelocity += angleDifference * this.angularAcceleration;

		// Apply damping to angular velocity
		this.angularVelocity *= this.angularDamping;

		// Limit angular velocity to maxTurnRate
		if (Math.abs(this.angularVelocity) > this.maxTurnRate) {
			this.angularVelocity = Math.sign(this.angularVelocity) * this.maxTurnRate;
		}

		// Update heading based on angular velocity
		this.heading += this.angularVelocity;

		// Normalize heading to the range [0, 2π]
		this.heading = (this.heading + Math.PI * 2) % (Math.PI * 2);

		// Move in current heading direction
		this.x += Math.cos(this.heading) * this.speed;
		this.y += Math.sin(this.heading) * this.speed;

		// Bounce off walls.
		if (this.x < 0) {
			this.x = 0;
			this.heading = Math.PI - this.heading;
			this.targetHeading = this.heading; // Reset target heading after bounce
			this.angularVelocity = 0; // Reset angular velocity after bounce
		} else if (this.x > canvas.width) {
			this.x = canvas.width;
			this.heading = Math.PI - this.heading;
			this.targetHeading = this.heading;
			this.angularVelocity = 0;
		}

		if (this.y < 0) {
			this.y = 0;
			this.heading = -this.heading;
			this.targetHeading = this.heading;
			this.angularVelocity = 0;
		} else if (this.y > canvas.height) {
			this.y = canvas.height;
			this.heading = -this.heading;
			this.targetHeading = this.heading;
			this.angularVelocity = 0;
		}
	}
}

class Bee extends Dancer {
	constructor(canvas) {
		super(canvas);
		this.maxSpeed = 1.5;
		this.vx = 0;
		this.vy = 0;
		this.acceleration = 0.05;
		this.minDistance = 80; // Minimum distance to maintain from other bees
		this.repulsionStrength = 0.2; // How strongly to push away when too close
		// Cache squared values to avoid sqrt calculations
		this.minDistanceSquared = this.minDistance * this.minDistance;
		this.maxSpeedSquared = this.maxSpeed * this.maxSpeed;
		this.setupEmoji('🐝', 36, Math.PI, 36);
	}

	step(canvas) {
		// 1. ATTRACTION: Find nearest Flower dancer using subscription group
		let nearestResult = this.findNearest('flowers');
		let nearestDancer = null;
		let minDistance = Infinity;

		if (nearestResult) {
			nearestDancer = nearestResult.point;
			minDistance = nearestResult.distance;
		}

		// Accelerate toward nearest dancer
		if (nearestDancer) {
			const dx = nearestDancer.x - this.x;
			const dy = nearestDancer.y - this.y;

			if (minDistance > 0) {
				const invDistance = 1 / minDistance;
				const dirX = dx * invDistance;
				const dirY = dy * invDistance;

				this.vx += dirX * this.acceleration;
				this.vy += dirY * this.acceleration;
			}
		}

		// 2. REPULSION: Only from the nearest bee
		let repulsionX = 0;
		let repulsionY = 0;

		const nearestBee = this.findNearest('bees');

		if (nearestBee) {
			const dx = nearestBee.point.x - this.x;
			const dy = nearestBee.point.y - this.y;
			const distance = nearestBee.distance;

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

		// Limit velocity, update position, handle boundaries
		const speedSquared = this.vx * this.vx + this.vy * this.vy;
		if (speedSquared > this.maxSpeedSquared) {
			const speedFactor = this.maxSpeed / Math.sqrt(speedSquared);
			this.vx *= speedFactor;
			this.vy *= speedFactor;
		}

		// Update position
		this.x += this.vx;
		this.y += this.vy;

		// Bounce off boundaries
		if (this.x < 0) {
			this.x = 0;
			this.vx = -this.vx * 0.8;
		} else if (this.x > canvas.width) {
			this.x = canvas.width;
			this.vx = -this.vx * 0.8;
		}

		if (this.y < 0) {
			this.y = 0;
			this.vy = -this.vy * 0.8;
		} else if (this.y > canvas.height) {
			this.y = canvas.height;
			this.vy = -this.vy * 0.8;
		}

		this.heading = this.getHeadingFromVelocity();
	}

	// Optimize heading calculation
	getHeadingFromVelocity() {
		const vx = this.vx;
		const vy = this.vy;
		if (vx === 0 && vy === 0) return 0;
		return Math.atan2(vy, vx);
	}
}

export function start(canvas) {
	const ctx = canvas.getContext('2d');
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	// Create bounds for subscription groups
	const bounds = {
		x: 0,
		y: 0,
		width: canvas.width,
		height: canvas.height,
	};

	// Create agents first
	const flowersSize = 8;
	const flowers = Array.from(
		{ length: flowersSize },
		() => new Flower(canvas, 4 + Math.random() * 2, 0.03 + Math.random() * 0.04)
	);

	const beesSize = 128;
	const bees = Array.from({ length: beesSize }, () => new Bee(canvas));

	// Create subscription groups with agents
	const flowersGroup = new SubscriptionGroup(flowers, bounds);
	const beesGroup = new SubscriptionGroup(bees, bounds);

	// Set up subscriptions for each bee
	bees.forEach(bee => {
		bee.subscribe(flowersGroup, 'flowers');
		bee.subscribe(beesGroup, 'bees');
	});

	const dancers = [...bees, ...flowers];
	const subscriptionGroups = [flowersGroup, beesGroup];

	// Function to update all subscription groups
	function updateSubscriptionGroups() {
		const canvasBounds = {
			width: canvas.width,
			height: canvas.height,
		};

		subscriptionGroups.forEach(group => {
			group.updateSpatialIndex(canvasBounds);
		});
	}

	function step(canvas) {
		// Update subscription groups' spatial indices
		updateSubscriptionGroups();

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

		for (let i = 0; i < flowers.length; i++) {
			flowers[i].draw(ctx);
		}

		for (let i = 0; i < bees.length; i++) {
			bees[i].draw(ctx);
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
