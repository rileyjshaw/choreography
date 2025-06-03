class SubscriptionGroup {
	constructor(agents = [], bounds = { x: 0, y: 0, width: 1000, height: 1000 }) {
		this.dancers = new Set(Array.isArray(agents) ? agents : [agents]);
		this.bounds = bounds;

		// For simple nearest neighbor searches, we can use a direct approach
		// instead of a QuadTree, which is more efficient for radius queries
		this.useSimpleSearch = true;
	}

	/**
	 * Update the spatial index with current dancer positions
	 * @param {Object} canvasBounds - Optional bounds to update from canvas
	 */
	updateSpatialIndex(canvasBounds = null) {
		// Update bounds if canvas dimensions changed
		if (canvasBounds) {
			this.bounds.width = canvasBounds.width;
			this.bounds.height = canvasBounds.height;
		}
	}

	/**
	 * Find the nearest dancer to a point using a simple O(n) algorithm
	 * This is more efficient than QuadTree for small numbers of agents
	 * when we only need the single nearest neighbor
	 *
	 * @param {number} x - X coordinate
	 * @param {number} y - Y coordinate
	 * @param {number} maxDistance - Maximum search distance
	 * @param {Object} excludeDancer - Dancer to exclude (typically self)
	 * @returns {Object|null} Result containing nearest dancer and distance
	 */
	findNearest(x, y, maxDistance = Infinity, excludeDancer = null) {
		let nearestDancer = null;
		let minDistanceSquared = maxDistance * maxDistance;

		for (const dancer of this.dancers) {
			if (dancer === excludeDancer) continue;

			const dx = x - dancer.x;
			const dy = y - dancer.y;
			const distanceSquared = dx * dx + dy * dy;

			if (distanceSquared < minDistanceSquared) {
				nearestDancer = dancer;
				minDistanceSquared = distanceSquared;
			}
		}

		return nearestDancer
			? {
					point: nearestDancer,
					distance: Math.sqrt(minDistanceSquared),
			  }
			: null;
	}

	/**
	 * Get all dancers in this group
	 * @returns {Array} Array of dancers
	 */
	getDancers() {
		return Array.from(this.dancers);
	}

	/**
	 * Get the number of dancers in this group
	 * @returns {number} Number of dancers
	 */
	size() {
		return this.dancers.size;
	}

	/**
	 * Add dancers to this subscription group
	 * @param {Array|Object} dancers - A single dancer or array of dancers
	 * @deprecated Use constructor instead
	 */
	add(dancers) {
		console.warn('SubscriptionGroup.add() is deprecated. Pass agents to the constructor instead.');
		if (Array.isArray(dancers)) {
			dancers.forEach(dancer => this.dancers.add(dancer));
		} else {
			this.dancers.add(dancers);
		}
	}

	/**
	 * Remove dancers from this subscription group
	 * @param {Array|Object} dancers - A single dancer or array of dancers
	 */
	remove(dancers) {
		if (Array.isArray(dancers)) {
			dancers.forEach(dancer => this.dancers.delete(dancer));
		} else {
			this.dancers.delete(dancers);
		}
	}
}

export default SubscriptionGroup;
