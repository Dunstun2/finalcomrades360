/**
 * Calculate distance between two locations using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Smart agent matching algorithm for delivery assignment
 * @param {Array} agents - Array of delivery agents with profiles
 * @param {object} order - Order object with delivery details
 * @param {number} requiredCapacity - Required capacity for this order
 * @returns {Array} Sorted array of matched agents with match scores
 */
function matchAgentsToOrder(agents, order, requiredCapacity = 0) {
    const matches = [];

    // Determine order type for capacity and scoring adjustments
    const isFastfoodOrder = (order.OrderItems || []).some(item => item.fastFoodId != null);
    const maxCapacity = isFastfoodOrder ? 20 : 5; // Fastfood: 20 orders, Products: 5 orders

    // Pre-calculate order coordinates
    let deliveryLat = null;
    let deliveryLng = null;
    let pickupLat = null;
    let pickupLng = null;

    // Get delivery coordinates
    if (order.deliveryLat && order.deliveryLng) {
        deliveryLat = parseFloat(order.deliveryLat);
        deliveryLng = parseFloat(order.deliveryLng);
    } else if (order.lat && order.lng) {
        deliveryLat = parseFloat(order.lat);
        deliveryLng = parseFloat(order.lng);
    } else if (order.deliveryAddress) {
        const coords = getTownCoordinates(order.deliveryAddress);
        if (coords) {
            deliveryLat = coords.lat;
            deliveryLng = coords.lng;
        }
    }

    // Get pickup coordinates (seller location)
    if (order.seller && order.seller.businessLat && order.seller.businessLng) {
        pickupLat = parseFloat(order.seller.businessLat);
        pickupLng = parseFloat(order.seller.businessLng);
    }

    for (const agent of agents) {
        const profile = agent.deliveryProfile;
        if (!profile || !profile.isActive) continue;

        const { isComplete } = checkProfileCompleteness(profile, agent);
        if (!isComplete) continue;

        const match = {
            agent,
            score: 0,
            reasons: [],
            localityScore: 0,
            efficiencyScore: 0
        };

        // 1. Availability Score (40 points) - Most important
        if (isAgentAvailableNow(profile)) {
            match.score += 40;
            match.reasons.push('Available now');
        } else {
            match.score += 5; // Small bonus even if not in schedule
        }

        // 2. Capacity Score (35 points) - Critical for efficiency
        const currentLoad = agent.currentLoad || 0; // Now passed from service
        const availableCapacity = maxCapacity - currentLoad;

        if (availableCapacity >= 1) {
            if (availableCapacity >= 5) {
                match.score += 35;
                match.reasons.push(`High capacity available (${availableCapacity} slots)`);
            } else if (availableCapacity >= 3) {
                match.score += 25;
                match.reasons.push(`Good capacity available (${availableCapacity} slots)`);
            } else {
                match.score += 15;
                match.reasons.push(`Limited capacity (${availableCapacity} slots)`);
            }
        } else {
            continue; // Skip agents at capacity
        }

        // 3. Locality & Route Efficiency Score (50 points) - NEW SMART SCORING
        const localityScore = calculateLocalityScore(agent.id, deliveryLat, deliveryLng, pickupLat, pickupLng, isFastfoodOrder);
        match.localityScore = localityScore.score;
        match.efficiencyScore = localityScore.efficiency;

        if (localityScore.score >= 40) {
            match.score += 50;
            match.reasons.push(localityScore.reason);
        } else if (localityScore.score >= 25) {
            match.score += 35;
            match.reasons.push(localityScore.reason);
        } else if (localityScore.score >= 15) {
            match.score += 20;
            match.reasons.push(localityScore.reason);
        } else {
            match.score += 5;
            match.reasons.push(localityScore.reason);
        }

        // 4. Distance to Pickup Score (15 points) - For faster collection
        if (pickupLat && pickupLng) {
            const agentLoc = parseLocation(profile.currentLocation);
            if (agentLoc && agentLoc.lat && agentLoc.lng) {
                const pickupDistance = calculateDistance(
                    pickupLat, pickupLng,
                    parseFloat(agentLoc.lat), parseFloat(agentLoc.lng)
                );

                if (pickupDistance < 1) {
                    match.score += 15;
                    match.reasons.push(`Very close to pickup (${pickupDistance.toFixed(1)}km)`);
                } else if (pickupDistance < 3) {
                    match.score += 10;
                    match.reasons.push(`Close to pickup (${pickupDistance.toFixed(1)}km)`);
                } else if (pickupDistance < 5) {
                    match.score += 5;
                    match.reasons.push(`Reasonable pickup distance (${pickupDistance.toFixed(1)}km)`);
                }
            }
        }

        // 5. Vehicle Type Suitability (10 points)
        if (profile.vehicleType) {
            const vehicle = profile.vehicleType.toLowerCase();
            if (isFastfoodOrder && (vehicle.includes('bike') || vehicle.includes('motorcycle'))) {
                match.score += 10;
                match.reasons.push('Suitable vehicle for fastfood delivery');
            } else if (!isFastfoodOrder && (vehicle.includes('car') || vehicle.includes('van'))) {
                match.score += 10;
                match.reasons.push('Suitable vehicle for product delivery');
            }
        }

        matches.push(match);
    }

    // Sort by total score descending, then by locality score for tie-breaking
    return matches.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.localityScore - a.localityScore;
    });
}

/**
 * Check if agent is available based on their schedule
 * @param {object} profile - DeliveryAgentProfile object
 * @returns {boolean} True if available now
 */
function isAgentAvailableNow(profile) {
    if (!profile.isActive) return false;

    let availability = null;
    try {
        availability = typeof profile.availability === 'string'
            ? JSON.parse(profile.availability)
            : profile.availability;
    } catch (e) {
        return true; // If can't parse, assume available
    }

    if (!availability) return true;

    const now = new Date();
    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDay = dayMap[now.getDay()];

    // Check if today is in available days
    if (Array.isArray(availability.days) && availability.days.length > 0) {
        if (!availability.days.includes(currentDay)) return false;
    }

    // Check time range
    if (availability.from && availability.to) {
        const [fromHour, fromMin] = availability.from.split(':').map(n => parseInt(n, 10));
        const [toHour, toMin] = availability.to.split(':').map(n => parseInt(n, 10));
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const fromMinutes = fromHour * 60 + fromMin;
        const toMinutes = toHour * 60 + toMin;

        if (currentMinutes < fromMinutes || currentMinutes > toMinutes) return false;
    }

    return true;
}

/**
 * Estimate delivery time based on distance and vehicle type
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} vehicleType - Type of vehicle (bike, motorcycle, car, van, truck)
 * @returns {number} Estimated time in minutes
 */
function estimateDeliveryTime(distanceKm, vehicleType = 'car') {
    const speedMap = {
        'bike': 15, // km/h
        'motorcycle': 40,
        'car': 50,
        'van': 45,
        'truck': 40
    };

    const speed = speedMap[vehicleType] || 40;
    const timeHours = distanceKm / speed;
    const timeMinutes = Math.ceil(timeHours * 60);

    // Add buffer time for stops, traffic, etc.
    const bufferMinutes = Math.ceil(distanceKm * 2); // 2 minutes per km buffer

    return timeMinutes + bufferMinutes;
}

/**
 * Get approximate coordinates for a town/county if exact coordinates are missing.
 * Provides fallback for common Kenyan towns.
 */
function getTownCoordinates(town, county) {
    const data = {
        'nairobi': { lat: -1.2921, lng: 36.8219 },
        'juja': { lat: -1.1026, lng: 37.0131 },
        'thika': { lat: -1.0333, lng: 37.0667 },
        'ruiru': { lat: -1.15, lng: 36.9583 },
        'kiambu': { lat: -1.1714, lng: 36.8356 },
        'mombasa': { lat: -4.0435, lng: 39.6682 },
        'kisumu': { lat: -0.0917, lng: 34.7680 },
        'nakuru': { lat: -0.3031, lng: 36.0800 },
        'eldoret': { lat: 0.5143, lng: 35.2697 },
        'kericho': { lat: -0.3677, lng: 35.2831 },
        'kitale': { lat: 1.0191, lng: 35.0023 },
        'meru': { lat: 0.0463, lng: 37.6498 },
        'nyeri': { lat: -0.4167, lng: 36.9500 },
        'machakos': { lat: -1.5177, lng: 37.2634 },
        'kitui': { lat: -1.3750, lng: 38.0163 },
        'garissa': { lat: -0.4532, lng: 39.6461 },
        'wajir': { lat: 1.7471, lng: 40.0573 },
        'mandera': { lat: 3.9366, lng: 41.8569 },
        'lodwar': { lat: 3.1167, lng: 35.5833 },
        'kakamega': { lat: 0.2827, lng: 34.7519 },
        'bungoma': { lat: 0.5635, lng: 34.5606 },
        'busia': { lat: 0.4608, lng: 34.1115 },
        'malindi': { lat: -3.2175, lng: 40.1169 },
        'diani': { lat: -4.2797, lng: 39.5947 },
        'kilifi': { lat: -3.6307, lng: 39.8499 }
    };

    const t = town?.toLowerCase().trim();
    const c = county?.toLowerCase().trim();

    // Direct town match
    if (t && data[t]) return data[t];
    
    // Partial town match
    if (t) {
        const foundKey = Object.keys(data).find(k => t.includes(k) || k.includes(t));
        if (foundKey) return data[foundKey];
    }

    // County match fallback
    if (c && data[c]) return data[c];
    if (c) {
        const foundKey = Object.keys(data).find(k => c.includes(k) || k.includes(c));
        if (foundKey) return data[foundKey];
    }

    return null;
}

/**
 * Safely parse a location JSON string
 * @param {string|object} loc - The location data to parse
 * @returns {object|null} Parsed location or null
 */
function parseLocation(loc) {
    if (!loc) return null;
    if (typeof loc === 'object') return loc;
    try {
        return JSON.parse(loc);
    } catch (e) {
        return null;
    }
}

/**
 * Get current active delivery tasks for an agent
 * @param {number} agentId - Agent user ID
 * @returns {number} Number of active tasks
 */
function getAgentCurrentLoad(agentId) {
    // This will be populated by the calling service with actual database query
    // For now, return a cached value or 0
    return 0; // Placeholder - will be overridden by service
}

/**
 * Check if a delivery agent profile is complete enough for work
 * @param {object} profile - DeliveryAgentProfile object
 * @param {object} user - User object for the agent
 * @returns {object} { isComplete, missing }
 */
function checkProfileCompleteness(profile, user) {
    const missing = [];
    if (!profile) return { isComplete: false, missing: ['profile_not_created'] };

    if (!profile.location) missing.push('location');
    if (!profile.vehicleType) missing.push('vehicle_type');
    if (!profile.vehiclePlate && profile.vehicleType !== 'Walking' && profile.vehicleType !== 'Bicycle') {
        missing.push('vehicle_plate');
    }
    if (!user || !user.phone) missing.push('phone_number');
    if (!profile.emergencyContact) missing.push('emergency_contact');

    return {
        isComplete: missing.length === 0,
        missing
    };
}
function calculateLocalityScore(agentId, deliveryLat, deliveryLng, pickupLat, pickupLng, isFastfoodOrder) {
    // This function will be enhanced with actual database queries
    // For now, return intelligent scoring based on available data

    let score = 0;
    let efficiency = 0;
    let reason = 'Basic locality matching';

    if (!deliveryLat || !deliveryLng) {
        return { score: 10, efficiency: 40, reason: 'Location data limited' };
    }

    // For fastfood orders, prioritize locality clustering
    if (isFastfoodOrder) {
        // Fastfood agents can handle multiple deliveries in the same area
        score = 35;
        efficiency = 75;
        reason = 'Optimized for fastfood delivery clusters';

        // If pickup location is available, check if agent is already servicing this area
        if (pickupLat && pickupLng) {
            // Calculate pickup-to-delivery distance
            const pickupToDeliveryDistance = calculateDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);

            if (pickupToDeliveryDistance < 2) {
                score += 10;
                efficiency += 15;
                reason = 'Pickup and delivery in same locality cluster';
            } else if (pickupToDeliveryDistance < 5) {
                score += 5;
                efficiency += 10;
                reason = 'Pickup and delivery in nearby areas';
            }
        }
    } else {
        // For product deliveries, be more conservative
        score = 25;
        efficiency = 60;
        reason = 'Suitable for product delivery routes';

        // Products may require more careful routing
        if (pickupLat && pickupLng) {
            const pickupToDeliveryDistance = calculateDistance(pickupLat, pickupLng, deliveryLat, deliveryLng);

            if (pickupToDeliveryDistance < 3) {
                score += 10;
                efficiency += 15;
                reason = 'Efficient pickup-to-delivery route';
            }
        }
    }

    return { score, efficiency, reason };
}

module.exports = {
    calculateDistance,
    matchAgentsToOrder,
    isAgentAvailableNow,
    estimateDeliveryTime,
    parseLocation,
    checkProfileCompleteness,
    getTownCoordinates,
    getAgentCurrentLoad,
    calculateLocalityScore
};
