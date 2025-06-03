import Dancer from '../lib/Dancer';
import SubscriptionGroup from '../lib/SubscriptionGroup';

const GROUP_SIZE = 30;

class RPSAgent extends Dancer {
	constructor(canvas, emoji, { speed = 2, emojiOffset = Math.PI / 2 } = {}) {
		super(canvas);
		this.maxSpeed = speed;
		this.vx = 0;
		this.vy = 0;
		this.acceleration = 0.05;
		this.minDistance = 60; // Minimum distance to maintain from same type
		this.repulsionStrength = 0.1; // How strongly to push away when too close
		this.fleeStrength = 0.3; // How strongly to flee from attackers (higher than acceleration)
		this.chaseStrength = 0.2; // How strongly to chase targets (prey)
		this.setupEmoji(emoji, 36, emojiOffset, 36);
		this.type = emoji; // Add type identifier
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
	const ctx = canvas.getContext('2d');
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	// Create subscription groups with canvas bounds
	const bounds = {
		x: 0,
		y: 0,
		width: canvas.width,
		height: canvas.height,
	};

	// Create agents first
	const rocks = Array.from(
		{ length: GROUP_SIZE },
		() => new RPSAgent(canvas, '🪨', { speed: 1.5 + Math.random(), emojiOffset: Math.PI })
	);
	const papers = Array.from({ length: GROUP_SIZE }, () => new RPSAgent(canvas, '📄', { speed: 1.5 + Math.random() }));
	const scissors = Array.from(
		{ length: GROUP_SIZE },
		() => new RPSAgent(canvas, '✂️', { speed: 1.5 + Math.random(), emojiOffset: -Math.PI / 2 })
	);

	// Create subscription groups with agents
	const rockGroup = new SubscriptionGroup(rocks, bounds);
	const paperGroup = new SubscriptionGroup(papers, bounds);
	const scissorsGroup = new SubscriptionGroup(scissors, bounds);

	rocks.forEach(agent => {
		agent.subscribe(rockGroup, 'same');
		agent.subscribe(paperGroup, 'attacker'); // Rocks run from papers
		agent.subscribe(scissorsGroup, 'target'); // Rocks chase scissors
	});

	papers.forEach(agent => {
		agent.subscribe(paperGroup, 'same');
		agent.subscribe(scissorsGroup, 'attacker'); // Papers run from scissors
		agent.subscribe(rockGroup, 'target'); // Papers chase rocks
	});

	scissors.forEach(agent => {
		agent.subscribe(scissorsGroup, 'same');
		agent.subscribe(rockGroup, 'attacker'); // Scissors run from rocks
		agent.subscribe(paperGroup, 'target'); // Scissors chase papers
	});

	const dancers = [...rocks, ...papers, ...scissors];
	const subscriptionGroups = [rockGroup, paperGroup, scissorsGroup];

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
		// Update all subscription groups' spatial indices
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

		for (let i = 0; i < rocks.length; i++) {
			rocks[i].draw(ctx);
		}

		for (let i = 0; i < papers.length; i++) {
			papers[i].draw(ctx);
		}

		for (let i = 0; i < scissors.length; i++) {
			scissors[i].draw(ctx);
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
