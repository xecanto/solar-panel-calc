/**
 * Helper functions for debugging map and GeoJSON issues
 */
class DebugHelper {
    /**
     * Check if map resources are available and working
     */
    static checkMapResources() {
        console.log("=== MAP RESOURCES CHECK ===");
        
        // Check if mapboxgl is loaded
        if (typeof mapboxgl !== 'undefined') {
            console.log("✓ mapboxgl is loaded:", mapboxgl.version);
        } else {
            console.error("✗ mapboxgl is not loaded!");
        }
        
        // Check if turf is loaded
        if (typeof turf !== 'undefined') {
            console.log("✓ turf is loaded");
            
            // Test basic turf functionality
            try {
                const point = turf.point([0, 0]);
                console.log("  ✓ turf.point works");
            } catch (e) {
                console.error("  ✗ turf.point failed:", e);
            }
            
            try {
                const poly = turf.polygon([[
                    [0, 0], [1, 0], [1, 1], [0, 1], [0, 0]
                ]]);
                console.log("  ✓ turf.polygon works");
            } catch (e) {
                console.error("  ✗ turf.polygon failed:", e);
            }
        } else {
            console.error("✗ turf is not loaded!");
        }
        
        console.log("===========================");
    }
    
    /**
     * Validate a GeoJSON feature
     */
    static validateFeature(feature) {
        if (!feature) {
            console.error("Feature is null or undefined");
            return false;
        }
        
        if (feature.type !== 'Feature') {
            console.error("Not a GeoJSON Feature:", feature);
            return false;
        }
        
        if (!feature.geometry) {
            console.error("Feature has no geometry:", feature);
            return false;
        }
        
        if (!feature.properties) {
            console.warn("Feature has no properties:", feature);
            // Not a critical error, just a warning
        }
        
        return true;
    }
    
    /**
     * Add a test point to the map for debugging
     */
    static addTestPoint(map, coordinates) {
        if (!map || !map.loaded()) {
            console.error("Map not loaded for test point");
            return;
        }
        
        try {
            // Add a test source and layer
            if (!map.getSource('debug-test-point')) {
                map.addSource('debug-test-point', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: coordinates || [-122.4194, 37.7749]
                        },
                        properties: {}
                    }
                });
                
                map.addLayer({
                    id: 'debug-test-point',
                    type: 'circle',
                    source: 'debug-test-point',
                    paint: {
                        'circle-radius': 10,
                        'circle-color': '#ff0000'
                    }
                });
                
                console.log("Test point added to map at", coordinates);
            }
        } catch (e) {
            console.error("Error adding test point:", e);
        }
    }
    
    /**
     * Check if panels can be added to the map
     */
    static testAddPanels(map) {
        if (!map || !map.loaded()) {
            console.error("Map not loaded for panel test");
            return;
        }
        
        try {
            // Create a simple test panel
            const testPanel = {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [-122.419, 37.775],
                        [-122.418, 37.775],
                        [-122.418, 37.776],
                        [-122.419, 37.776],
                        [-122.419, 37.775]
                    ]]
                },
                properties: {
                    id: 'test-panel',
                    groupId: 'test-group'
                }
            };
            
            // Try to add a test source and layer
            if (map.getSource('test-panel-source')) {
                map.removeLayer('test-panel-layer');
                map.removeSource('test-panel-source');
            }
            
            map.addSource('test-panel-source', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [testPanel]
                }
            });
            
            map.addLayer({
                id: 'test-panel-layer',
                type: 'fill',
                source: 'test-panel-source',
                paint: {
                    'fill-color': '#00ff00',
                    'fill-opacity': 0.7
                }
            });
            
            console.log("Test panel added successfully");
            return true;
        } catch (e) {
            console.error("Error testing panel addition:", e);
            return false;
        }
    }
}

// Add a global debug function
window.debugMap = function() {
    console.log("Running map debug checks...");
    
    // Get the map controller instance
    const mapController = window.mapController;
    if (!mapController) {
        console.error("mapController not found in window object");
        return;
    }
    
    // Check if map exists and is loaded
    if (!mapController.map) {
        console.error("Map not initialized");
        return;
    }
    
    console.log("Map ready state:", mapController.isMapReady);
    console.log("Map loaded:", mapController.map.loaded());
    
    // Check resources
    DebugHelper.checkMapResources();
    
    // Test if we can add layers
    DebugHelper.testAddPanels(mapController.map);
    
    // Add a test point to see if the map is rendering
    DebugHelper.addTestPoint(mapController.map);
    
    console.log("Debug checks complete");
};

// Add helper to window for console access
window.DebugHelper = DebugHelper;
