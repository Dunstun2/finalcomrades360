const axios = require('axios');

/**
 * Smart Geocoder for Comrades360+
 * Resolves physical addresses and town names to GPS coordinates.
 */
async function geocodeAddress(address, town, county) {
    try {
        // Construct search queries in order of precision
        const queries = [];
        
        if (address && town && county) {
            queries.push(`${address}, ${town}, ${county}, Kenya`);
        }
        if (town && county) {
            queries.push(`${town}, ${county}, Kenya`);
        } else if (town) {
            queries.push(`${town}, Kenya`);
        }

        for (const query of queries) {
            console.log(`[Geocoder] Attempting to resolve: "${query}"`);
            
            try {
                const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                    params: {
                        q: query,
                        format: 'json',
                        limit: 1,
                        addressdetails: 1
                    },
                    headers: {
                        'User-Agent': 'Comrades360Plus-DeliverySystem/1.0 (contact@comrades360.com)'
                    },
                    timeout: 5000
                });

                if (response.data && response.data.length > 0) {
                    const result = response.data[0];
                    console.log(`[Geocoder] Success! Resolved "${query}" to [${result.lat}, ${result.lon}]`);
                    return {
                        lat: parseFloat(result.lat),
                        lng: parseFloat(result.lon),
                        display_name: result.display_name
                    };
                }
            } catch (err) {
                console.warn(`[Geocoder] Query "${query}" failed:`, err.message);
            }
            
            // Respect Nominatim rate limit (1 req/sec)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return null;
    } catch (e) {
        console.error('[Geocoder] Critical error:', e.message);
        return null;
    }
}

module.exports = {
    geocodeAddress
};
