class MapController {
    constructor() {
        this.map = null;
        this.polygons = [];
        this.panelFeatures = [];
        this.isMapReady = false;
        this.initPromise = null;
        this.panelClickHandlerAdded = false;
    }
    
    // Return a promise that resolves when the map is fully loaded
    initMap() {
        if (this.initPromise) {
            return this.initPromise;
        }
        
        this.initPromise = new Promise((resolve, reject) => {
            try {
                this.map = new mapboxgl.Map({
                    container: 'map',
                    style: 'mapbox://styles/mapbox/satellite-v9',
                    center: [-122.4194, 37.7749], // San Francisco default
                    zoom: 18,
                    attributionControl: false,
                    preserveDrawingBuffer: true // Needed for image export functionality
                });
                
                // Add controls
                this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
                this.map.addControl(new mapboxgl.GeolocateControl({
                    positionOptions: {
                        enableHighAccuracy: true
                    },
                    trackUserLocation: true
                }), 'top-right');
                this.map.addControl(new mapboxgl.AttributionControl({
                    compact: true
                }), 'bottom-right');
                this.map.addControl(new mapboxgl.ScaleControl({
                    maxWidth: 150,
                    unit: 'metric'
                }), 'bottom-left');

                // Setup event handling for load
                this.map.on('load', () => {
                    this.setupSources();
                    this.isMapReady = true;
                    resolve();
                });
                
                this.map.on('error', (e) => {
                    console.error('Map error:', e);
                    reject(e);
                });
                
                // Add window resize handling for responsiveness
                window.addEventListener('resize', this.debounce(() => {
                    if (this.map) {
                        this.map.resize();
                    }
                }, 250));
                
            } catch (error) {
                console.error('Error initializing map:', error);
                reject(error);
            }
        });
        
        return this.initPromise;
    }
    
    // Debounce function to improve performance
    debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    
    setupSources() {
        // Use try-catch to handle any errors during source setup
        try {
            this.map.addSource('polygons', {
                'type': 'geojson',
                'data': {
                    'type': 'FeatureCollection',
                    'features': []
                }
            });

            this.map.addLayer({
                'id': 'polygon-fill',
                'type': 'fill',
                'source': 'polygons',
                'layout': {},
                'paint': {
                    'fill-color': '#0080ff',
                    'fill-opacity': 0.5
                }
            });

            this.map.addLayer({
                'id': 'polygon-outline',
                'type': 'line',
                'source': 'polygons',
                'layout': {},
                'paint': {
                    'line-color': '#0080ff',
                    'line-width': 2
                }
            });
            
            // Add UI elements
            this.addUIControls();
        } catch (error) {
            console.error('Error setting up map sources:', error);
            throw error;
        }
    }
    
    addUIControls() {
        // Add screenshot functionality only
        $('#calculate-arrays').after(
            '<div class="mt-2"><button id="take-screenshot" class="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 w-full">Take Screenshot</button></div>'
        );
        
        // Add screenshot functionality
        $('#take-screenshot').click(() => {
            this.takeScreenshot();
        });

        // Export functionality for saving designs
        $('#results').after(
            '<div class="mt-4">' +
            '<button id="export-design" class="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 w-full">Export Design</button>' +
            '</div>' +
            '<div class="mt-2 text-xs text-gray-500 italic">' +
            'Tip: Click on any panel to remove its group. Use keyboard shortcuts: D (draw), R (remove), C (clear), ESC (cancel)' +
            '</div>' +
            '</div>'
        );
        
        // Add input class for easy selection
        $('input[type="number"]').addClass('parameter-input');
    }
    
    takeScreenshot() {
        if (!this.map) return;
        
        try {
            // Get map canvas
            const canvas = this.map.getCanvas();
            
            // Create a link element
            const link = document.createElement('a');
            link.download = 'solar-array-map.png';
            
            // Convert canvas to data URL and set as link's href
            link.href = canvas.toDataURL('image/png');
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error taking screenshot:', error);
            alert('Failed to take screenshot. Please try again.');
        }
    }
    
    updateMap() {
        if (this.map && this.map.getSource('polygons')) {
            this.map.getSource('polygons').setData({
                type: 'FeatureCollection',
                features: this.polygons
            });
        }
    }
    
    clearPanelVisualization() {
        try {
            console.log("Clearing panel visualization");
            
            // Check if the map is ready
            if (!this.map || !this.isMapReady) {
                console.warn("Map not ready during clearPanelVisualization");
                return;
            }
            
            // Remove layers and source in the correct order
            if (this.map.getLayer('solar-panels')) {
                console.log("Removing solar-panels layer");
                this.map.removeLayer('solar-panels');
            }
            
            if (this.map.getLayer('solar-panels-fill')) {
                console.log("Removing solar-panels-fill layer");
                this.map.removeLayer('solar-panels-fill');
            }
            
            if (this.map.getSource('solar-panels')) {
                console.log("Removing solar-panels source");
                this.map.removeSource('solar-panels');
            }
            
            // Clear the panel features array
            this.panelFeatures = [];
            console.log("Panel features cleared");
        } catch (error) {
            console.error('Error during clearPanelVisualization:', error);
        }
    }
    
    updateResults() {
        // Calculate total area in square meters
        let totalArea = 0;
        for (const poly of this.polygons) {
            totalArea += poly.properties.area;
        }
        
        // Update UI elements
        $('#total-area').text(totalArea.toFixed(1));
        
        // Calculate panel count based on current panel features
        const totalPanels = this.panelFeatures.length;
        $('#total-panels').text(totalPanels);
        
        // Assuming 400W per panel for estimation
        const estimatedCapacity = (totalPanels * 0.4).toFixed(1);
        $('#estimated-capacity').text(estimatedCapacity);
    }
    
    visualizePanels(panelGroupsData) {
        try {
            // Debug information for panel groups data
            console.log("Panel groups data received:", panelGroupsData);
            
            // Flatten all panels into a single array
            const newPanelFeatures = [];
            
            if (Array.isArray(panelGroupsData)) {
                panelGroupsData.forEach(groupData => {
                    if (groupData && Array.isArray(groupData.panels)) {
                        console.log(`Adding ${groupData.panels.length} panels from polygon ${groupData.polygonId}`);
                        newPanelFeatures.push(...groupData.panels);
                    } else {
                        console.warn("Invalid group data format:", groupData);
                    }
                });
            } else {
                console.error("panelGroupsData is not an array:", panelGroupsData);
                return; // Exit early if data is invalid
            }
            
            console.log(`Visualizing ${newPanelFeatures.length} total panels`);
            
            // Make sure we have valid panel features before proceeding
            if (!newPanelFeatures.length) {
                console.warn("No valid panel features to visualize");
                return;
            }
            
            // Verify first panel feature for debugging
            if (newPanelFeatures.length > 0) {
                console.log("Sample panel feature:", JSON.stringify(newPanelFeatures[0]));
            }
            
            // Clear existing visualization first without clearing new data
            this.clearPanelVisualization();
            
            // Then store the new panel features
            this.panelFeatures = newPanelFeatures;
            
            // Debug to confirm map is ready
            if (!this.map) {
                console.error("Map is not initialized");
                return;
            }
            
            if (!this.isMapReady) {
                console.error("Map is not ready yet");
                return;
            }
            
            // Wait to ensure clearing operation is complete
            setTimeout(() => {
                try {
                    // Create a GeoJSON FeatureCollection from panel features
                    const featureCollection = {
                        type: 'FeatureCollection',
                        features: this.panelFeatures
                    };
                    
                    console.log(`Adding feature collection with ${featureCollection.features.length} features`);
                    
                    // Verify the GeoJSON structure is valid
                    if (featureCollection.features.length === 0) {
                        console.error("Feature collection is empty after timeout");
                        return;
                    }
                    
                    // Add the source with all panel features
                    this.map.addSource('solar-panels', {
                        type: 'geojson',
                        data: featureCollection
                    });
                    console.log("Solar panels source added with data:", featureCollection.features.length);
                    
                    // Add fill layer for panel bodies
                    this.map.addLayer({
                        id: 'solar-panels-fill',
                        type: 'fill',
                        source: 'solar-panels',
                        paint: {
                            'fill-color': '#ffbb00',
                            'fill-opacity': 0.7 // Increased opacity for better visibility
                        }
                    });
                    console.log("Solar panels fill layer added");
                    
                    // Add outline layer for panel borders
                    this.map.addLayer({
                        id: 'solar-panels',
                        type: 'line',
                        source: 'solar-panels',
                        paint: {
                            'line-color': '#333',
                            'line-width': 1 // Slightly thicker for better visibility
                        }
                    });
                    console.log("Solar panels line layer added");
                    
                    // Add click event handler for panels if not already added
                    if (!this.panelClickHandlerAdded) {
                        this.map.on('click', 'solar-panels-fill', (e) => {
                            if (!this.isMapReady) return;
                            if (e.features && e.features.length > 0) {
                                const groupId = e.features[0].properties.groupId;
                                if (groupId) {
                                    this.removePanelGroup(groupId);
                                }
                            }
                        });
                        
                        // Add hover effect for panels
                        this.map.on('mouseenter', 'solar-panels-fill', () => {
                            this.map.getCanvas().style.cursor = 'pointer';
                        });

                        this.map.on('mouseleave', 'solar-panels-fill', () => {
                            this.map.getCanvas().style.cursor = '';
                        });
                        
                        this.panelClickHandlerAdded = true;
                    }
                    
                    console.log("Panel visualization added to map successfully");
                    
                    // Force a map repaint to ensure panels are shown
                    this.map.triggerRepaint();
                    
                    // Update the results display
                    this.updateResults();
                } catch (error) {
                    console.error('Error adding panel visualization in timeout:', error);
                }
            }, 100); // Small delay to ensure clearing is complete
        } catch (error) {
            console.error('Error in visualizePanels:', error);
        }
    }
    
    // Add this method to force map repaint
    triggerRepaint() {
        if (this.map) {
            this.map.resize();
            console.log("Triggered map repaint");
        }
    }
    
    removePanelGroup(groupId) {
        console.log(`Removing panel group: ${groupId}`);
        
        // Filter out all panels with the specified groupId
        const originalCount = this.panelFeatures.length;
        this.panelFeatures = this.panelFeatures.filter(panel => 
            panel.properties.groupId !== groupId
        );
        console.log(`Removed ${originalCount - this.panelFeatures.length} panels from group ${groupId}`);
        
        // Update panel visualization
        if (this.map.getSource('solar-panels')) {
            this.map.getSource('solar-panels').setData({
                type: 'FeatureCollection',
                features: this.panelFeatures
            });
            console.log("Updated panel source with remaining panels");
        }
        
        // Update results display
        this.updateResults();
    }
}
