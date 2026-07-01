const { getDistance, extractPlaceName } = require('../utils/geoUtils');
const { Op } = require('sequelize');

async function processOrderLocation(order) {
  try {
    const { KnownLocation } = require('../database/models.registry');
    const { deliveryLat, deliveryLng, deliveryAddress, status, deliveryAgentId } = order;
    if (!deliveryAddress) return;

    const placeName = extractPlaceName(deliveryAddress);
    if (!placeName) return;

    let targetLat = deliveryLat;
    let targetLng = deliveryLng;

    // If order is delivered, try to capture the agent's actual location at that moment
    if (status === 'delivered' && deliveryAgentId) {
      const { DeliveryAgentProfile } = require('../database/models.registry');
      const agentProfile = await DeliveryAgentProfile.findOne({ where: { userId: deliveryAgentId } });
      if (agentProfile && agentProfile.currentLocation) {
        try {
          const loc = JSON.parse(agentProfile.currentLocation);
          if (loc.lat && loc.lng) {
            targetLat = loc.lat;
            targetLng = loc.lng;
          }
        } catch (_) {}
      }
    }

    if (!targetLat || !targetLng) return;

    // Check if we have a nearby known location (within 100m) with the same name
    // OR a known location with the same name regardless of distance (to update/correct coordinates)
    const existing = await KnownLocation.findOne({
      where: { name: placeName }
    });

    if (existing) {
      const dist = getDistance(targetLat, targetLng, existing.lat, existing.lng);
      if (dist <= 0.2) { // Within 200m, it's the same place
        existing.usageCount += 1;
        // Refine coordinates (weighted average)
        existing.lat = (Number(existing.lat) * 0.8) + (Number(targetLat) * 0.2);
        existing.lng = (Number(existing.lng) * 0.8) + (Number(targetLng) * 0.2);
        if (existing.usageCount >= 3) existing.isVerified = true;
        await existing.save();
      } else {
        // Same name but far away? Could be a duplicate name (e.g. "Gate 1" in different estates)
        // For now, we only learn if coordinates are consistent for that specific name
      }
    } else {
      // New candidate
      await KnownLocation.create({
        name: placeName,
        lat: targetLat,
        lng: targetLng,
        usageCount: 1,
        isVerified: false
      });
    }
  } catch (error) {
    console.error('Error in processOrderLocation:', error);
  }
}

async function getPlaceAtLocation(lat, lng) {
  if (!lat || !lng) return null;
  
  const { KnownLocation, Warehouse, PickupStation } = require('../database/models.registry');

  // 1. Check Verified Learned Locations
  const nearby = await KnownLocation.findOne({
    where: {
      isVerified: true,
      lat: { [Op.between]: [Number(lat) - 0.0015, Number(lat) + 0.0015] },
      lng: { [Op.between]: [Number(lng) - 0.0015, Number(lng) + 0.0015] }
    }
  });

  if (nearby) {
    const dist = getDistance(lat, lng, nearby.lat, nearby.lng);
    if (dist <= (nearby.radius / 1000)) return nearby.name;
  }

  // 2. Check Hubs (Warehouses)
  const nearbyWarehouse = await Warehouse.findOne({
    where: {
      lat: { [Op.between]: [Number(lat) - 0.0015, Number(lat) + 0.0015] },
      lng: { [Op.between]: [Number(lng) - 0.0015, Number(lng) + 0.0015] }
    }
  });
  if (nearbyWarehouse) {
    const dist = getDistance(lat, lng, nearbyWarehouse.lat, nearbyWarehouse.lng);
    if (dist <= 0.15) return nearbyWarehouse.name;
  }

  // 3. Check Pickup Stations
  const nearbyStation = await PickupStation.findOne({
    where: {
      lat: { [Op.between]: [Number(lat) - 0.0015, Number(lat) + 0.0015] },
      lng: { [Op.between]: [Number(lng) - 0.0015, Number(lng) + 0.0015] }
    }
  });
  if (nearbyStation) {
    const dist = getDistance(lat, lng, nearbyStation.lat, nearbyStation.lng);
    if (dist <= 0.15) return nearbyStation.name;
  }

  return null;
}

module.exports = { processOrderLocation, getPlaceAtLocation };
