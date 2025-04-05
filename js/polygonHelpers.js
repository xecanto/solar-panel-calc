/**
 * Helper functions for polygon operations
 */

// Global polygon helpers
window.PolygonHelpers = {
    /**
     * Enhanced subtraction of one polygon from another
     * @param {Object} outerPolygon - The base polygon
     * @param {Object} innerPolygon - The polygon to subtract
     * @returns {Object} The resulting polygon after subtraction
     */
    subtract: function(outerPolygon, innerPolygon) {
        console.log("Starting advanced polygon subtraction");
        
        // Ensure we're working with proper GeoJSON features
        const outer = this.ensureFeature(outerPolygon);
        const inner = this.ensureFeature(innerPolygon);
        
        // Try to fix any invalid input geometries first
        const fixedOuter = this.fixPolygon(outer);
        const fixedInner = this.fixPolygon(inner);
        
        // Method 1: Direct difference with fixed polygons
        try {
            const result = turf.difference(fixedOuter, fixedInner);
            if (result && this.isValidResult(result)) {
                console.log("Fixed polygon difference succeeded");
                return result;
            }
        } catch (e) {
            console.warn("Fixed polygon difference failed:", e);
        }
        
        // Method 2: Try buffering both polygons slightly
        try {
            const bufferedOuter = turf.buffer(fixedOuter, 0.0000001);
            const bufferedInner = turf.buffer(fixedInner, 0.0000001);
            
            const result = turf.difference(bufferedOuter, bufferedInner);
            if (result && this.isValidResult(result)) {
                console.log("Buffered difference succeeded");
                return result;
            }
        } catch (e) {
            console.warn("Buffered difference failed:", e);
        }
        
        // Method 3: Try with larger buffer
        try {
            const bufferedOuter = turf.buffer(fixedOuter, 0.000001);
            const bufferedInner = turf.buffer(fixedInner, 0.000001);
            
            const result = turf.difference(bufferedOuter, bufferedInner);
            if (result && this.isValidResult(result)) {
                console.log("Larger buffered difference succeeded");
                return result;
            }
        } catch (e) {
            console.warn("Larger buffered difference failed:", e);
        }
        
        // Method 4: Manual hole creation
        try {
            // Get coordinates of both polygons
            const outerCoords = fixedOuter.geometry.coordinates[0];
            const innerCoords = fixedInner.geometry.coordinates[0];
            
            // Ensure inner polygon is correctly oriented for a hole (opposite of outer)
            const reversedInnerCoords = [...innerCoords].reverse();
            
            // Create a new feature with the hole
            const newGeometry = {
                type: 'Polygon',
                coordinates: [outerCoords, reversedInnerCoords]
            };
            
            const newFeature = {
                type: 'Feature',
                properties: fixedOuter.properties || {},
                geometry: newGeometry
            };
            
            // Validate this new feature
            if (this.isValidResult(newFeature)) {
                console.log("Manual hole creation succeeded");
                return newFeature;
            }
        } catch (e) {
            console.warn("Manual hole creation failed:", e);
        }
        
        // Method 5: Last resort - simplified versions of polygons
        try {
            const simplifiedOuter = turf.simplify(fixedOuter, { tolerance: 0.0001, highQuality: true });
            const simplifiedInner = turf.simplify(fixedInner, { tolerance: 0.0001, highQuality: true });
            
            const result = turf.difference(simplifiedOuter, simplifiedInner);
            if (result && this.isValidResult(result)) {
                console.log("Simplified polygon difference succeeded");
                return result;
            }
        } catch (e) {
            console.warn("Simplified polygon difference failed:", e);
        }
        
        console.error("All subtraction methods failed");
        return outer; // Return original as fallback
    },
    
    /**
     * Ensure an object is a proper GeoJSON Feature
     * @param {Object} geometry - The geometry or feature to process
     * @returns {Object} A proper GeoJSON Feature
     */
    ensureFeature: function(geometry) {
        if (!geometry) return null;
        
        // If it's already a Feature, return it
        if (geometry.type === 'Feature' && geometry.geometry) {
            return geometry;
        }
        
        // If it's a geometry object, convert to Feature
        if (geometry.type === 'Polygon' && geometry.coordinates) {
            return {
                type: 'Feature',
                properties: {},
                geometry: geometry
            };
        }
        
        // If it's something else entirely, try to convert it
        try {
            return turf.feature(geometry);
        } catch (e) {
            console.error("Cannot convert to Feature:", e);
            return null;
        }
    },
    
    /**
     * Validate a polygon result
     * @param {Object} polygon - The polygon to validate
     * @returns {boolean} Whether the polygon is valid
     */
    isValidResult: function(polygon) {
        if (!polygon) return false;
        if (!polygon.geometry) return false;
        if (!polygon.geometry.coordinates) return false;
        if (polygon.geometry.coordinates.length === 0) return false;
        
        try {
            // Additional validation to ensure the polygon is usable
            const area = turf.area(polygon);
            if (area <= 0) return false;
            
            return turf.booleanValid(polygon);
        } catch (e) {
            console.error("Validation error:", e);
            return false;
        }
    },
    
    /**
     * Fix self-intersections and other topology errors in polygons
     * @param {Object} polygon - The polygon to fix
     * @returns {Object} The fixed polygon
     */
    fixPolygon: function(polygon) {
        if (!polygon) return null;
        
        try {
            // First try the simplest approach - buffer with 0
            const buffered = turf.buffer(polygon, 0);
            if (this.isValidResult(buffered)) {
                return buffered;
            }
            
            // If that didn't work, try simplifying the polygon
            const simplified = turf.simplify(polygon, { tolerance: 0.00001, highQuality: true });
            if (this.isValidResult(simplified)) {
                return simplified;
            }
            
            // If all else fails, return the original
            return polygon;
        } catch (e) {
            console.warn("Unable to fix polygon:", e);
            return polygon;
        }
    }
};

// Update DrawingTools to use the new helpers
document.addEventListener('DOMContentLoaded', function() {
    if (typeof DrawingTools !== 'undefined') {
        console.log("Registering enhanced polygon subtraction methods");
        
        // We'll attach directly to the DrawingTools prototype
        // This approach avoids the need to completely override the method
        DrawingTools.prototype.origSafeSubtract = DrawingTools.prototype.safeSubtract;
        
        DrawingTools.prototype.safeSubtract = function(outerPolygon, innerPolygon) {
            console.log("Using enhanced subtract method");
            if (window.PolygonHelpers) {
                return window.PolygonHelpers.subtract(outerPolygon, innerPolygon);
            } else {
                return this.origSafeSubtract(outerPolygon, innerPolygon);
            }
        };
    } else {
        console.warn("DrawingTools not defined yet - helpers will be attached when available");
        
        // Create a function to try again later
        const attemptAttach = function() {
            if (typeof DrawingTools !== 'undefined') {
                console.log("Found DrawingTools, attaching helpers");
                DrawingTools.prototype.origSafeSubtract = DrawingTools.prototype.safeSubtract;
                
                DrawingTools.prototype.safeSubtract = function(outerPolygon, innerPolygon) {
                    console.log("Using enhanced subtract method (delayed attachment)");
                    if (window.PolygonHelpers) {
                        return window.PolygonHelpers.subtract(outerPolygon, innerPolygon);
                    } else {
                        return this.origSafeSubtract(outerPolygon, innerPolygon);
                    }
                };
            } else {
                // Try again after a short delay
                setTimeout(attemptAttach, 1000);
            }
        };
        
        // Start the attempt process
        attemptAttach();
    }
});
