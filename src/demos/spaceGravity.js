import Dancer from '../lib/Dancer';
import SubscriptionGroup from '../lib/SubscriptionGroup';

const PLANET_EMOJIS = ['🪐', '🪐', '🪐', '🪐', '🪐', '🌍', '🌏', '🌎', '🌕'];
const SPACESHIP_EMOJI = '🛰️';
const GRAVITY_CONSTANT = 10;
const MAX_GRAVITY_DISTANCE = 500;
const NEAREST_PLANETS_COUNT = 3; // Number of nearest planets affecting each spaceship.

class Planet extends Dancer {
	constructor(canvas, speed = 0.5, maxTurnRate = 0.1) {
		super(canvas);
		this.speed = speed;
		this.heading = Math.random() * Math.PI * 2;
		this.maxTurnRate = maxTurnRate;
		// Properties for turn momentum
		this.targetHeading = this.heading;
		this.angularVelocity = 0;
		this.angularAcceleration = 0.001;
		this.angularDamping = 0.95;
		this.targetChangeFrequency = 0.02;

		this.size = 0.8 + Math.random() * 1.5;
		this.mass = this.size * this.size * 2;
		this.setupEmoji(PLANET_EMOJIS[Math.floor(Math.random() * PLANET_EMOJIS.length)], 36 * this.size, 0, 1);

		// Size for collision detection (approximate radius in pixels).
		this.radius = Math.floor(18 * this.size);
	}

	step(canvas, deltaTime) {
		// Normalize deltaTime (60fps as baseline)
		const timeScale = deltaTime / 16.67;

		// Occasionally change target heading
		if (Math.random() < this.targetChangeFrequency * timeScale) {
			this.targetHeading = Math.random() * Math.PI * 2;
		}

		// More efficient angle normalization
		let angleDifference = this.targetHeading - this.heading;
		// Use % operator instead of loops for normalization
		angleDifference = ((angleDifference + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;

		// Apply angular acceleration toward the target heading
		this.angularVelocity += angleDifference * this.angularAcceleration * timeScale;

		// Apply damping to angular velocity
		this.angularVelocity *= Math.pow(this.angularDamping, timeScale);

		// Limit angular velocity to maxTurnRate
		if (Math.abs(this.angularVelocity) > this.maxTurnRate) {
			this.angularVelocity = Math.sign(this.angularVelocity) * this.maxTurnRate;
		}

		// Update heading based on angular velocity
		this.heading += this.angularVelocity * timeScale;

		// Normalize heading to the range [0, 2π]
		this.heading = (this.heading + Math.PI * 2) % (Math.PI * 2);

		// Move in current heading direction
		this.x += Math.cos(this.heading) * this.speed * timeScale;
		this.y += Math.sin(this.heading) * this.speed * timeScale;

		// Loop around walls instead of bouncing
		if (this.x < 0) {
			this.x = canvas.width;
		} else if (this.x > canvas.width) {
			this.x = 0;
		}

		if (this.y < 0) {
			this.y = canvas.height;
		} else if (this.y > canvas.height) {
			this.y = 0;
		}
	}
}

class Spaceship extends Dancer {
	constructor(canvas) {
		super(canvas);
		this.maxSpeed = 2;
		this.vx = (Math.random() - 0.5) * this.maxSpeed;
		this.vy = (Math.random() - 0.5) * this.maxSpeed;
		this.acceleration = 0.01;
		this.drag = 0.999; // Reduced drag in space (changed from 0.995)
		this.setupEmoji(SPACESHIP_EMOJI, 18, 0, 36);
		this.nearestPlanets = []; // Store nearest planets for visualization
		this.radius = 12; // Approximate radius for collision detection
		this.bounceFactor = 1; // Perfectly elastic collision
	}

	step(canvas, deltaTime) {
		// Normalize deltaTime (60fps as baseline)
		const timeScale = deltaTime / 16.67;

		// Find the nearest planets
		const planets = [];
		let nearestResult = this.findNearest('planets');

		// Find the NEAREST_PLANETS_COUNT nearest planets
		for (let i = 0; i < NEAREST_PLANETS_COUNT; i++) {
			if (nearestResult) {
				const planet = nearestResult.point;
				const distance = nearestResult.distance;

				if (distance < MAX_GRAVITY_DISTANCE) {
					planets.push({ planet, distance });

					// Remove this planet from consideration for next search
					const planetsGroup = this.subscriptionGroups.get('planets');
					if (planetsGroup) {
						planetsGroup.remove(planet);

						// Find next nearest
						nearestResult = this.findNearest('planets');

						// Add the planet back to the group
						planetsGroup.add(planet);
					}
				}
			}
		}

		// Store nearest planets for visualization
		this.nearestPlanets = planets;

		// Apply gravity from each of the nearest planets
		let totalGravityX = 0;
		let totalGravityY = 0;

		for (const { planet, distance } of planets) {
			if (distance > 0) {
				const dx = planet.x - this.x;
				const dy = planet.y - this.y;

				// Calculate gravity strength based on distance and planet mass
				// F = G * m1 * m2 / r^2
				const gravityStrength = (GRAVITY_CONSTANT * planet.mass) / (distance * distance);

				// Calculate direction
				const dirX = dx / distance;
				const dirY = dy / distance;

				// Add to total gravity force
				totalGravityX += dirX * gravityStrength;
				totalGravityY += dirY * gravityStrength;

				// Check for collision with planet
				const collisionDistance = this.radius + planet.radius;
				if (distance < collisionDistance) {
					// Calculate new velocity after bounce
					// First, compute the normal vector (from planet to spaceship)
					const nx = -dirX; // Reversed because we want away from planet
					const ny = -dirY;

					// Calculate the dot product of velocity and normal
					const dotProduct = this.vx * nx + this.vy * ny;

					// Apply reflection formula: v' = v - 2(v·n)n
					this.vx = (this.vx - 2 * dotProduct * nx) * this.bounceFactor;
					this.vy = (this.vy - 2 * dotProduct * ny) * this.bounceFactor;

					// Move the spaceship out of collision
					this.x = planet.x + nx * collisionDistance;
					this.y = planet.y + ny * collisionDistance;
				}
			}
		}

		// Apply gravity to velocity
		this.vx += totalGravityX * timeScale;
		this.vy += totalGravityY * timeScale;

		// Apply drag
		this.vx *= Math.pow(this.drag, timeScale);
		this.vy *= Math.pow(this.drag, timeScale);

		// Limit velocity to max speed
		const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
		if (speed > this.maxSpeed) {
			this.vx = (this.vx / speed) * this.maxSpeed;
			this.vy = (this.vy / speed) * this.maxSpeed;
		}

		// Update position
		this.x += this.vx * timeScale;
		this.y += this.vy * timeScale;

		// Update heading based on velocity
		if (this.vx !== 0 || this.vy !== 0) {
			this.heading = Math.atan2(this.vy, this.vx);
		}

		// Bounce off walls
		if (this.x < 0) {
			this.x = 0;
			this.vx = -this.vx * this.bounceFactor;
		} else if (this.x > canvas.width) {
			this.x = canvas.width;
			this.vx = -this.vx * this.bounceFactor;
		}

		if (this.y < 0) {
			this.y = 0;
			this.vy = -this.vy * this.bounceFactor;
		} else if (this.y > canvas.height) {
			this.y = canvas.height;
			this.vy = -this.vy * this.bounceFactor;
		}
	}

	draw(ctx) {
		super.draw(ctx);

		// Draw gravity lines to nearest planets.
		for (const { planet, distance } of this.nearestPlanets) {
			const opacity = Math.min(1, ((GRAVITY_CONSTANT * planet.mass) / (distance * distance)) * 50);

			ctx.beginPath();
			ctx.moveTo(this.x, this.y);
			ctx.lineTo(planet.x, planet.y);
			ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
			ctx.stroke();
		}
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

	// Create planets
	const planetsCount = 10;
	const planets = Array.from(
		{ length: planetsCount },
		() => new Planet(canvas, 0.2 + Math.random() * 0.3, 0.02 + Math.random() * 0.03)
	);

	// Create spaceships
	const spaceshipsCount = 50;
	const spaceships = Array.from({ length: spaceshipsCount }, () => new Spaceship(canvas));

	// Create subscription groups
	const planetsGroup = new SubscriptionGroup(planets, bounds);

	// Set up subscriptions for each spaceship
	spaceships.forEach(spaceship => {
		spaceship.subscribe(planetsGroup, 'planets');
	});

	// Combine all dancers
	const dancers = [...planets, ...spaceships];
	const subscriptionGroups = [planetsGroup];

	// Function to update all subscription groups
	function updateSubscriptionGroups() {
		subscriptionGroups.forEach(group => {
			group.updateSpatialIndex(bounds);
		});
	}

	// Animation loop
	let animationId;
	let lastTime = 0;
	function animate(timestamp) {
		const deltaTime = timestamp - lastTime;
		lastTime = timestamp;
		if (!window.isTrailsEnabled) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}

		// Update and draw all dancers
		for (const dancer of dancers) {
			dancer.step(canvas, deltaTime);
			dancer.draw(ctx);
		}

		animationId = requestAnimationFrame(animate);
	}

	function resize() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		bounds.width = canvas.width;
		bounds.height = canvas.height;
		updateSubscriptionGroups();
	}

	animationId = requestAnimationFrame(animate);

	window.addEventListener('resize', resize);
	resize();

	return () => {
		cancelAnimationFrame(animationId);
		window.removeEventListener('resize', resize);
	};
}
