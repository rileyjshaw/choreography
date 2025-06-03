import Dancer from '../lib/Dancer';
import SubscriptionGroup from '../lib/SubscriptionGroup';

const VERTICAL_CAR_EMOJI = '🚙';
const HORIZONTAL_CAR_EMOJI = '🚕';
const RED_LIGHT_EMOJI = '🚨';
const REACTION_DISTANCE = 80; // Distance at which horizontal cars respond to vertical cars
const RED_LIGHT_DISTANCE = 120; // Distance at which cars respond to red lights
const N_RED_LIGHTS = 6;
const N_VERTICAL_CARS_ = 120;
const N_HORIZONTAL_CARS = 80;

class RedLight extends Dancer {
	constructor(canvas, speed = 3, maxTurnRate = 0.1) {
		super(canvas);
		this.speed = speed;
		this.heading = Math.random() * Math.PI * 2;
		this.maxTurnRate = maxTurnRate;
		// Properties for turn momentum
		this.targetHeading = this.heading;
		this.angularVelocity = 0;
		this.angularAcceleration = 0.001;
		this.angularDamping = 0.95; // Damping factor to prevent excessive oscillation
		this.targetChangeFrequency = 0.02; // Probability of changing target direction
		this.setupEmoji(RED_LIGHT_EMOJI, 36, 0, 1);
	}

	step(canvas) {
		// Occasionally change target heading
		if (Math.random() < this.targetChangeFrequency) {
			this.targetHeading = Math.random() * Math.PI * 2;
		}

		// More efficient angle normalization
		let angleDifference = this.targetHeading - this.heading;
		// Use % operator instead of loops for normalization
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

		// Bounce off walls
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

class Car extends Dancer {
	constructor(canvas, isVertical) {
		super(canvas);
		this.isVertical = isVertical;
		this.speed = 2 + Math.random() * 2; // Base speed
		this.currentSpeed = this.speed; // Current speed (can be 0 when stopped)
		this.direction = Math.random() > 0.5 ? 1 : -1; // 1 = down/right, -1 = up/left
		this.setupEmoji(isVertical ? VERTICAL_CAR_EMOJI : HORIZONTAL_CAR_EMOJI, 36, isVertical ? Math.PI / 2 : 0, 2);

		// Set initial position
		if (isVertical) {
			// Vertical cars are positioned randomly horizontally, but at top or bottom
			this.x = Math.random() * canvas.width;
			this.y = this.direction === 1 ? 0 : canvas.height;
		} else {
			// Horizontal cars are positioned randomly vertically, but at left or right
			this.x = this.direction === 1 ? 0 : canvas.width;
			this.y = Math.random() * canvas.height;
		}
	}

	step(canvas) {
		// Check for nearby red lights
		const nearestRedLight = this.findNearest('redLights');
		let shouldStop = false;

		if (nearestRedLight && nearestRedLight.distance < RED_LIGHT_DISTANCE) {
			shouldStop = true;
		}

		// For horizontal cars, also check for vertical cars
		if (!this.isVertical) {
			const nearestVerticalCar = this.findNearest('verticalCars');
			if (nearestVerticalCar && nearestVerticalCar.distance < REACTION_DISTANCE) {
				shouldStop = true;
			}
		}

		// Update speed based on whether we should stop
		this.currentSpeed = shouldStop ? 0 : this.speed;

		// Move the car
		if (this.isVertical) {
			this.y += this.direction * this.currentSpeed;

			// Check if we've hit the boundaries
			if (this.y < 0 || this.y > canvas.height) {
				this.direction *= -1; // Reverse direction
				this.y = this.y < 0 ? 0 : canvas.height; // Snap to boundary
			}
		} else {
			this.x += this.direction * this.currentSpeed;

			// Check if we've hit the boundaries
			if (this.x < 0 || this.x > canvas.width) {
				this.direction *= -1; // Reverse direction
				this.x = this.x < 0 ? 0 : canvas.width; // Snap to boundary
			}
		}

		this.heading = this.direction * Math.PI;
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

	const redLights = Array.from(
		{ length: N_RED_LIGHTS },
		() => new RedLight(canvas, 3 + Math.random() * 2, 0.03 + Math.random() * 0.04)
	);

	const verticalCars = Array.from({ length: N_VERTICAL_CARS_ }, () => new Car(canvas, true));

	const horizontalCars = Array.from({ length: N_HORIZONTAL_CARS }, () => new Car(canvas, false));

	// Create subscription groups with agents
	const redLightsGroup = new SubscriptionGroup(redLights, bounds);
	const verticalCarsGroup = new SubscriptionGroup(verticalCars, bounds);
	const horizontalCarsGroup = new SubscriptionGroup(horizontalCars, bounds);

	// Set up subscriptions for each car
	verticalCars.forEach(car => {
		car.subscribe(redLightsGroup, 'redLights');
	});

	horizontalCars.forEach(car => {
		car.subscribe(redLightsGroup, 'redLights');
		car.subscribe(verticalCarsGroup, 'verticalCars');
	});

	// Combine all dancers for rendering
	const dancers = [...verticalCars, ...horizontalCars, ...redLights];
	const subscriptionGroups = [redLightsGroup, verticalCarsGroup, horizontalCarsGroup];

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

		for (let i = 0; i < verticalCars.length; i++) {
			verticalCars[i].draw(ctx);
		}

		for (let i = 0; i < horizontalCars.length; i++) {
			horizontalCars[i].draw(ctx);
		}

		for (let i = 0; i < redLights.length; i++) {
			redLights[i].draw(ctx);
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
