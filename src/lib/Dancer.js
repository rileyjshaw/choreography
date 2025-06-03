class Dancer {
	// Static cache for storing pre-rendered emoji images
	static emojiCache = new Map();

	constructor(canvas) {
		this.x = Math.random() * canvas.width;
		this.y = Math.random() * canvas.height;
		this.positions = [];
		this.maxPositionHistory = 1 << 7;
		this.subscriptionGroups = new Map();
		this.emoji = null;
		this.heading = 0;
	}

	step(canvas) {
		this.x = Math.max(0, Math.min(canvas.width, this.x + (Math.random() - 0.5) * 2));
		this.y = Math.max(0, Math.min(canvas.height, this.y + (Math.random() - 0.5) * 2));
	}

	updateHistory() {
		this.positions.unshift({ x: this.x, y: this.y });
		if (this.positions.length > this.maxPositionHistory) {
			this.positions.pop();
		}
	}

	/**
	 * Setup this dancer with an emoji and create pre-rendered rotation images
	 * @param {string} emoji - The emoji character to use
	 * @param {number} fontSize - Font size for the emoji (default 36)
	 * @param {number} angleOffset - Offset angle in radians (default π/2)
	 * @param {number} nImages - Number of pre-rendered images (default 36)
	 */
	setupEmoji(emoji, fontSize = 36, angleOffset = Math.PI / 2, nImages = 36) {
		this.emoji = emoji;
		if (emoji === '✂️') console.log(angleOffset);

		// Create a cache key for this emoji configuration.
		const cacheKey = `${emoji}_${fontSize}_${angleOffset}_${nImages}`;

		// Only create the rotated images if they don't exist in cache.
		if (!Dancer.emojiCache.has(cacheKey)) {
			// Pre-generate rotated images
			const tempCanvas = document.createElement('canvas');
			const size = fontSize * 2; // Make canvas twice the font size to allow for rotation
			tempCanvas.width = size;
			tempCanvas.height = size;
			const tempCtx = tempCanvas.getContext('2d');

			// Configure text rendering
			tempCtx.font = `${fontSize}px Arial`;
			tempCtx.textAlign = 'center';
			tempCtx.textBaseline = 'middle';

			// Pre-generate rotated images at each angle increment
			const angleStep = (Math.PI * 2) / nImages;
			const images = new Array(nImages);

			for (let i = 0; i < nImages; i++) {
				// Clear the temp canvas
				tempCtx.clearRect(0, 0, size, size);

				// Calculate the current angle
				const angle = i * angleStep + angleOffset;

				// Save context, rotate, draw emoji, restore context
				tempCtx.save();
				tempCtx.translate(size / 2, size / 2);
				tempCtx.rotate(angle);
				tempCtx.fillText(emoji, 0, 0);
				tempCtx.restore();

				// Create an image from the canvas
				const img = new Image();
				img.src = tempCanvas.toDataURL();
				images[i] = img;
			}

			// Store in cache along with metadata
			Dancer.emojiCache.set(cacheKey, {
				images,
				angleStep,
				nImages,
				size,
			});
		}

		// Store the cache key for quick lookup during drawing
		this.emojiCacheKey = cacheKey;
	}

	draw(ctx) {
		// If we have an emoji, use the rotated emoji image
		if (this.emoji && this.emojiCacheKey && Dancer.emojiCache.has(this.emojiCacheKey)) {
			const cache = Dancer.emojiCache.get(this.emojiCacheKey);

			// Get the appropriate rotated image for current heading
			const normalizedAngle = ((this.heading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
			const imageIndex = Math.round(normalizedAngle / cache.angleStep) % cache.nImages;
			const rotatedImage = cache.images[imageIndex];

			if (rotatedImage && rotatedImage.complete) {
				const halfSize = cache.size / 2;
				ctx.drawImage(rotatedImage, this.x - halfSize, this.y - halfSize);
				return;
			}
		}

		// Default drawing if no emoji or image available
		ctx.beginPath();
		ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
		ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
		ctx.fill();
	}

	subscribe(subscriptionGroup, name) {
		if (!subscriptionGroup) return;
		this.subscriptionGroups.set(name, subscriptionGroup);
	}

	unsubscribe(name) {
		this.subscriptionGroups.delete(name);
	}

	/**
	 * Find the nearest dancer in a subscription group
	 * @param {string} groupName - The name or alias of the subscription group
	 * @param {number} maxDistance - Maximum search distance
	 * @returns {Object} Result containing the nearest dancer and distance
	 */
	findNearest(groupName, maxDistance = Infinity) {
		const group = this.subscriptionGroups.get(groupName);
		if (!group) return null;

		return group.findNearest(this.x, this.y, maxDistance, this);
	}

	/**
	 * Get the current position
	 * @returns {Object} The current position {x, y}
	 */
	getPosition() {
		return { x: this.x, y: this.y };
	}

	// Find nearest dancer using a spatial index
	findNearestWithIndex(spatialIndex, excludeSelf = true) {
		if (!spatialIndex) return null;

		const result = spatialIndex.findNearest(this.x, this.y, Infinity, excludeSelf ? this : null);

		return result ? { dancer: result.point, distance: result.distance } : null;
	}

	// Get nearby dancers within radius using spatial index
	getNearbyWithIndex(spatialIndex, radius) {
		if (!spatialIndex) return [];

		return spatialIndex
			.query({
				x: this.x,
				y: this.y,
				radius: radius,
			})
			.filter(dancer => dancer !== this);
	}
}

export default Dancer;
