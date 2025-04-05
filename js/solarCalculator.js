class SolarCalculator {
    constructor(mapController) {
        this.mapController = mapController;
    }
    
    calculatePanelsOnly() {
        // First, ensure we clear any existing panels
        console.log("Starting panel calculation...");
        this.mapController.clearPanelVisualization();
        
        // Calculate panels for each polygon
        const totalPolygons = this.mapController.polygons.length;
        console.log(`Calculating panels for ${totalPolygons} polygons`);
        
        let totalPanelCount = 0;
        const panelsInEachPolygon = [];
        
        // Process each polygon
        for (const polygon of this.mapController.polygons) {
            try {
                console.log(`Processing polygon ${polygon.properties.id}...`);
                const panelPositions = this.calculatePanelsForPolygon(polygon);
                
                console.log(`Created ${panelPositions.length} panels for polygon ${polygon.properties.id}`);
                
                // Verify the panels are valid GeoJSON features
                if (panelPositions.length > 0) {
                    // Verify first panel has correct properties
                    console.log("Sample panel:", panelPositions[0]);
                    
                    // Make sure all panels have required GeoJSON properties
                    const validPanels = panelPositions.filter(panel => 
                        panel && panel.type === 'Feature' && 
                        panel.geometry && panel.geometry.type === 'Polygon'
                    );
                    
                    console.log(`Valid panels: ${validPanels.length} of ${panelPositions.length}`);
                    
                    if (validPanels.length > 0) {
                        panelsInEachPolygon.push({
                            polygonId: polygon.properties.id,
                            panels: validPanels
                        });
                        
                        totalPanelCount += validPanels.length;
                    }
                }
            } catch (error) {
                console.error(`Error calculating panels for polygon ${polygon.properties.id}:`, error);
            }
        }
        
        console.log(`Generated ${totalPanelCount} valid panels across all polygons`);
        
        // Check if we have any panels to visualize
        if (totalPanelCount === 0) {
            console.warn("No panels were generated!");
            return;
        }
        
        // Visualize the panels with a slight delay to ensure map is ready
        console.log("Calling visualizePanels with panel data...");
        setTimeout(() => {
            try {
                this.mapController.visualizePanels(panelsInEachPolygon);
                console.log(`Calculated ${totalPanelCount} panels`);
                console.log("Panels calculation completed");
            } catch (error) {
                console.error("Error during panel visualization:", error);
            }
        }, 100);
        
        // Update UI with results
        const estimatedCapacityKW = (totalPanelCount * 0.4).toFixed(1); // Assuming 400W per panel
        $('#total-panels').text(totalPanelCount);
        $('#estimated-capacity').text(estimatedCapacityKW);
    }
    
    calculatePanelsForPolygon(polygon) {
        // Get parameters from UI
        const panelWidth = parseFloat($('#panel-width').val()) || 1.0;
        const panelHeight = parseFloat($('#panel-height').val()) || 1.7;
        const panelsPerRow = parseInt($('#panels-per-row').val()) || 4;
        const rowsPerArray = parseInt($('#rows-per-array').val()) || 3;
        const hPanelSpacing = parseFloat($('#h-panel-spacing').val()) || 0.1;
        const vPanelSpacing = parseFloat($('#v-panel-spacing').val()) || 0.1;
        const hArraySpacing = parseFloat($('#h-array-spacing').val()) || 2.0;
        const vArraySpacing = parseFloat($('#v-array-spacing').val()) || 2.0;
        const azimuthAngle = parseInt($('#azimuth-angle').val()) || 180;
        const zenithAngle = parseInt($('#zenith-angle').val()) || 30;
        
        // Apply zenith angle to adjust panel height visualization
        const heightAdjustmentFactor = Math.cos((zenithAngle * Math.PI) / 180);
        const adjustedPanelHeight = panelHeight * heightAdjustmentFactor;
        
        console.log(`Original panel height: ${panelHeight}m, Adjusted height (zenith ${zenithAngle}°): ${adjustedPanelHeight.toFixed(2)}m`);
        
        // Calculate array dimensions for panel grouping
        const arrayWidth = (panelsPerRow * panelWidth) + ((panelsPerRow - 1) * hPanelSpacing);
        const arrayHeight = (rowsPerArray * adjustedPanelHeight) + ((rowsPerArray - 1) * vPanelSpacing);
        
        // Get the bounding box of the polygon
        const bbox = turf.bbox(polygon);
        const [minX, minY, maxX, maxY] = bbox;
        
        console.log(`Grid params: min(${minX},${minY}), max(${maxX},${maxY})`);
        console.log(`Panel group dimensions: ${arrayWidth.toFixed(2)}m x ${arrayHeight.toFixed(2)}m, Azimuth: ${azimuthAngle}°`);
        
        // Calculate approximate degrees per meter for this location
        const centerY = (minY + maxY) / 2; // Use center latitude for conversion
        const metersPerDegreeLat = 111320; // meters per degree latitude (approximate)
        const metersPerDegreeLon = 111320 * Math.cos(centerY * Math.PI / 180); // meters per degree longitude
        
        // Convert dimensions and spacing to degrees
        const arrayWidthDeg = arrayWidth / metersPerDegreeLon;
        const arrayHeightDeg = arrayHeight / metersPerDegreeLat;
        const hArraySpacingDeg = hArraySpacing / metersPerDegreeLon;
        const vArraySpacingDeg = vArraySpacing / metersPerDegreeLat;
        
        // Step size for grid placement
        const xStep = arrayWidthDeg / 2;
        const yStep = arrayHeightDeg / 2;
        
        // Create a grid of points covering the polygon's bbox
        const gridPoints = [];
        for (let x = minX; x <= maxX; x += xStep) {
            for (let y = minY; y <= maxY; y += yStep) {
                gridPoints.push([x, y]);
            }
        }
        
        // Filter points to those inside the polygon
        const pointsInPolygon = gridPoints.filter(point => {
            return turf.booleanPointInPolygon(turf.point(point), polygon);
        });
        
        console.log(`Found ${pointsInPolygon.length} potential panel group positions within polygon`);
        
        // Track placed panel groups for overlap checking
        const placedGroups = [];
        const panelPositions = [];
        
        // Function to check if a proposed panel group overlaps with existing groups
        const checkOverlap = (proposedGroup) => {
            for (const existing of placedGroups) {
                if (turf.booleanOverlap(proposedGroup, existing) || 
                    turf.booleanContains(proposedGroup, existing) || 
                    turf.booleanContains(existing, proposedGroup)) {
                    return true;
                }
            }
            return false;
        };
        
        // Process points in a sorted order to ensure proper sequence
        const sortedPoints = pointsInPolygon.sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
        
        sortedPoints.forEach(point => {
            try {
                // Create a panel group rectangle centered at this point
                const groupRect = this.createRectangle(
                    point,
                    arrayWidth,
                    arrayHeight,
                    azimuthAngle,
                    metersPerDegreeLon,
                    metersPerDegreeLat
                );
                
                // Check if group is completely within the polygon and doesn't overlap
                const isWithin = turf.booleanWithin(groupRect, polygon);
                const overlaps = checkOverlap(groupRect);
                
                if (isWithin && !overlaps) {
                    placedGroups.push(groupRect);
                    
                    // Now calculate individual panel positions for this group
                    const panelInfos = this.calculatePanelsForGroup(
                        point, 
                        panelWidth, 
                        panelHeight,
                        adjustedPanelHeight,
                        panelsPerRow, 
                        rowsPerArray, 
                        hPanelSpacing, 
                        vPanelSpacing, 
                        azimuthAngle,
                        metersPerDegreeLon,
                        metersPerDegreeLat,
                        polygon.properties.id
                    );
                    
                    panelPositions.push(...panelInfos);
                }
            } catch (error) {
                console.error("Error calculating panel group:", error);
            }
        });
        
        console.log(`Generated ${panelPositions.length} panels for polygon ${polygon.properties.id}`);
        return panelPositions;
    }
    
    calculatePanelsForGroup(
        center, 
        panelWidth, 
        panelHeight,
        adjustedPanelHeight,
        panelsPerRow, 
        rowsPerArray, 
        hPanelSpacing, 
        vPanelSpacing, 
        azimuthAngle,
        metersPerDegreeLon,
        metersPerDegreeLat,
        polygonId
    ) {
        const panels = [];
        const groupId = Date.now() + Math.floor(Math.random() * 10000);
        
        // Calculate group dimensions
        const groupWidth = (panelsPerRow * panelWidth) + ((panelsPerRow - 1) * hPanelSpacing);
        const groupHeight = (rowsPerArray * adjustedPanelHeight) + ((rowsPerArray - 1) * vPanelSpacing);
        
        // Convert to degrees
        const widthDeg = panelWidth / metersPerDegreeLon;
        const heightDeg = adjustedPanelHeight / metersPerDegreeLat;
        const hSpacingDeg = hPanelSpacing / metersPerDegreeLon;
        const vSpacingDeg = vPanelSpacing / metersPerDegreeLat;
        const groupWidthDeg = groupWidth / metersPerDegreeLon;
        const groupHeightDeg = groupHeight / metersPerDegreeLat;
        
        // Calculate the bottom-left corner of the group (before rotation)
        const startX = center[0] - (groupWidthDeg / 2);
        const startY = center[1] - (groupHeightDeg / 2);
        
        // Create panels
        for (let row = 0; row < rowsPerArray; row++) {
            for (let col = 0; col < panelsPerRow; col++) {
                // Calculate panel center position (before rotation)
                const panelCenterX = startX + (col * (widthDeg + hSpacingDeg)) + (widthDeg / 2);
                const panelCenterY = startY + (row * (heightDeg + vSpacingDeg)) + (heightDeg / 2);
                
                // Create unrotated panel rectangle (default azimuth of 180)
                let panelRect = this.createRectangle(
                    [panelCenterX, panelCenterY],
                    panelWidth,
                    adjustedPanelHeight,
                    180, // use default no-rotation angle for individual panels
                    metersPerDegreeLon,
                    metersPerDegreeLat
                );
                
                // Rotate the panel as a group around the group center if needed
                if (azimuthAngle !== 180) {
                    const rotationAngle = 180 - azimuthAngle;
                    panelRect = turf.transformRotate(panelRect, rotationAngle, { pivot: center });
                }
                
                // Add metadata
                panelRect.properties = {
                    groupId: groupId,
                    panelId: `${groupId}-panel-${row}-${col}`,
                    polygonId: polygonId,
                    row: row,
                    col: col,
                    originalWidth: panelWidth,
                    originalHeight: panelHeight,
                    adjustedHeight: adjustedPanelHeight
                };
                
                panels.push(panelRect);
            }
        }
        
        return panels;
    }
    
    createRectangle(center, width, height, azimuthAngle, metersPerDegreeLon, metersPerDegreeLat) {
        try {
            // Verify inputs are valid
            if (!center || center.length !== 2 || 
                !isFinite(width) || !isFinite(height) || 
                !isFinite(metersPerDegreeLon) || !isFinite(metersPerDegreeLat)) {
                
                console.error("Invalid parameters for createRectangle:", {
                    center, width, height, azimuthAngle, metersPerDegreeLon, metersPerDegreeLat
                });
                
                // Return a default small rectangle
                return turf.buffer(turf.point(center || [0, 0]), 0.0001);
            }
            
            // Convert width and height from meters to degrees
            const widthDeg = width / metersPerDegreeLon;
            const heightDeg = height / metersPerDegreeLat;
            
            // Calculate half dimensions
            const halfWidthDeg = widthDeg / 2;
            const halfHeightDeg = heightDeg / 2;
            
            // Create rectangle corners (clockwise from bottom-left)
            let coords = [
                [center[0] - halfWidthDeg, center[1] - halfHeightDeg], // bottom left
                [center[0] + halfWidthDeg, center[1] - halfHeightDeg], // bottom right
                [center[0] + halfWidthDeg, center[1] + halfHeightDeg], // top right
                [center[0] - halfWidthDeg, center[1] + halfHeightDeg], // top left
                [center[0] - halfWidthDeg, center[1] - halfHeightDeg]  // close the polygon
            ];
            
            // Create polygon
            let rectangle = turf.polygon([coords]);
            
            // Rotate based on azimuth angle if needed
            if (azimuthAngle !== 180) {
                // Calculate rotation angle (subtract from 180° since 180° is the default south-facing)
                const rotationAngle = 180 - azimuthAngle;
                
                try {
                    rectangle = turf.transformRotate(rectangle, rotationAngle, {
                        pivot: center
                    });
                } catch (e) {
                    console.error("Error rotating rectangle:", e);
                    // Fall back to unrotated rectangle
                }
            }
            
            return rectangle;
        } catch (error) {
            console.error("Error creating rectangle:", error, {
                center, width, height, azimuthAngle, 
                metersPerDegreeLon, metersPerDegreeLat
            });
            // Return a simple small rectangle at the center as fallback
            return turf.buffer(turf.point(center || [0, 0]), 0.0001);
        }
    }
}
