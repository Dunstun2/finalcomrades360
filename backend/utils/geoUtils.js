/**
 * Calculates the Haversine distance between two points in kilometers.
 */
function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Normalizes a delivery address to extract potential place names.
 */
function extractPlaceName(address) {
  if (!address) return null;
  // Look for common patterns: "Place Name, Town" or just "Place Name"
  // If there's a comma, take the first part
  let name = address.split(',')[0].trim();
  
  // Clean up common noise
  name = name.replace(/House\s*Number:?\s*\w*/gi, '')
             .replace(/Room\s*Number:?\s*\w*/gi, '')
             .replace(/Flat\s*\w*/gi, '')
             .trim();
             
  return name.length > 3 ? name : null;
}

module.exports = { getDistance, extractPlaceName };
