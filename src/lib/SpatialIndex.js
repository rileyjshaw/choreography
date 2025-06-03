class QuadTree {
	constructor(bounds, capacity = 4) {
		this.bounds = bounds;
		this.capacity = capacity;
		this.points = [];
		this.divided = false;
		this.northwest = null;
		this.northeast = null;
		this.southwest = null;
		this.southeast = null;
	}

	// Insert a point (dancer) into the quadtree
	insert(point) {
		if (!this.contains(point)) {
			return false;
		}

		if (this.points.length < this.capacity && !this.divided) {
			this.points.push(point);
			return true;
		}

		if (!this.divided) {
			this.subdivide();
		}

		// Try inserting in the most likely quadrant first based on position
		const midX = this.bounds.x + this.bounds.width / 2;
		const midY = this.bounds.y + this.bounds.height / 2;

		if (point.x < midX) {
			if (point.y < midY) {
				if (this.northwest.insert(point)) return true;
			} else {
				if (this.southwest.insert(point)) return true;
			}
		} else {
			if (point.y < midY) {
				if (this.northeast.insert(point)) return true;
			} else {
				if (this.southeast.insert(point)) return true;
			}
		}

		// Fall back to checking all quadrants if the optimistic approach failed
		return (
			this.northwest.insert(point) ||
			this.northeast.insert(point) ||
			this.southwest.insert(point) ||
			this.southeast.insert(point)
		);
	}

	// Check if a point is within this quadtree's bounds
	contains(point) {
		return (
			point.x >= this.bounds.x &&
			point.x <= this.bounds.x + this.bounds.width &&
			point.y >= this.bounds.y &&
			point.y <= this.bounds.y + this.bounds.height
		);
	}

	// Subdivide this quadtree into four quadtrees
	subdivide() {
		const x = this.bounds.x;
		const y = this.bounds.y;
		const w = this.bounds.width / 2;
		const h = this.bounds.height / 2;

		const nw = { x, y, width: w, height: h };
		const ne = { x: x + w, y, width: w, height: h };
		const sw = { x, y: y + h, width: w, height: h };
		const se = { x: x + w, y: y + h, width: w, height: h };

		this.northwest = new QuadTree(nw, this.capacity);
		this.northeast = new QuadTree(ne, this.capacity);
		this.southwest = new QuadTree(sw, this.capacity);
		this.southeast = new QuadTree(se, this.capacity);

		this.divided = true;

		// Move existing points into subdivided quadtrees
		for (const point of this.points) {
			this.northwest.insert(point) ||
				this.northeast.insert(point) ||
				this.southwest.insert(point) ||
				this.southeast.insert(point);
		}

		this.points = [];
	}

	// Find all points within a circle
	query(circle, found = []) {
		if (!this.intersectsCircle(circle)) {
			return found;
		}

		const radiusSquared = circle.radius * circle.radius;

		for (const point of this.points) {
			const dx = circle.x - point.x;
			const dy = circle.y - point.y;
			const distSquared = dx * dx + dy * dy;

			if (distSquared <= radiusSquared) {
				found.push(point);
			}
		}

		if (this.divided) {
			this.northwest.query(circle, found);
			this.northeast.query(circle, found);
			this.southwest.query(circle, found);
			this.southeast.query(circle, found);
		}

		return found;
	}

	// Check if this quadtree intersects with a circle
	intersectsCircle(circle) {
		const bounds = this.bounds;
		const closestX = Math.max(bounds.x, Math.min(circle.x, bounds.x + bounds.width));
		const closestY = Math.max(bounds.y, Math.min(circle.y, bounds.y + bounds.height));

		const dx = circle.x - closestX;
		const dy = circle.y - closestY;

		return dx * dx + dy * dy <= circle.radius * circle.radius;
	}

	// Find nearest point to a given location
	findNearest(x, y, maxDistance = Infinity, excludePoint = null) {
		let nearest = null;
		let nearestDistanceSquared = maxDistance * maxDistance;

		// Search in current quadtree
		for (const point of this.points) {
			if (point === excludePoint) continue;

			const dx = x - point.x;
			const dy = y - point.y;
			const distSquared = dx * dx + dy * dy;

			if (distSquared < nearestDistanceSquared) {
				nearest = point;
				nearestDistanceSquared = distSquared;
			}
		}

		// If subdivided, search in child quadtrees
		if (this.divided) {
			// Determine which quadrant the point is in and check that first
			const midX = this.bounds.x + this.bounds.width / 2;
			const midY = this.bounds.y + this.bounds.height / 2;

			const inNorth = y < midY;
			const inWest = x < midX;

			// Order quadrants by likelihood of containing the nearest neighbor
			const quads = [];

			// Add the most likely quadrant first
			if (inNorth && inWest) quads.push(this.northwest);
			else if (inNorth) quads.push(this.northeast);
			else if (inWest) quads.push(this.southwest);
			else quads.push(this.southeast);

			// Add the adjacent quadrants
			if (inNorth) {
				quads.push(this.southwest);
				quads.push(this.southeast);
			} else {
				quads.push(this.northwest);
				quads.push(this.northeast);
			}

			if (inWest) {
				quads.push(this.northeast);
				quads.push(this.southeast);
			} else {
				quads.push(this.northwest);
				quads.push(this.southwest);
			}

			// Remove duplicates
			const uniqueQuads = [...new Set(quads)];

			for (const quad of uniqueQuads) {
				// Only search if it could contain a closer point
				if (quad.distanceToPointSquared(x, y) < nearestDistanceSquared) {
					const candidate = quad.findNearest(x, y, Math.sqrt(nearestDistanceSquared), excludePoint);
					if (candidate) {
						nearest = candidate.point;
						nearestDistanceSquared = candidate.distance * candidate.distance;
					}
				}
			}
		}

		return nearest
			? {
					point: nearest,
					distance: Math.sqrt(nearestDistanceSquared),
			  }
			: null;
	}

	// Calculate minimum distance from a point to this quadtree
	distanceToPointSquared(x, y) {
		const bounds = this.bounds;
		const closestX = Math.max(bounds.x, Math.min(x, bounds.x + bounds.width));
		const closestY = Math.max(bounds.y, Math.min(y, bounds.y + bounds.height));

		const dx = x - closestX;
		const dy = y - closestY;

		return dx * dx + dy * dy;
	}

	// Use the squared distance method in the original method for compatibility
	distanceToPoint(x, y) {
		return Math.sqrt(this.distanceToPointSquared(x, y));
	}

	// Clear the quadtree
	clear() {
		this.points = [];
		if (this.divided) {
			this.northwest.clear();
			this.northeast.clear();
			this.southwest.clear();
			this.southeast.clear();
			this.divided = false;
			this.northwest = null;
			this.northeast = null;
			this.southwest = null;
			this.southeast = null;
		}
	}
}

export default QuadTree;
