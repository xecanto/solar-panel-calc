// Initialize Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiaWxpeWFuLWhpcmFuaSIsImEiOiJjbThmNHRxMDMwYTJ2MmpxdHAzbDZxOTNuIn0.nw9ek8mR679n6H-C-Ydhzg';

$(document).ready(function () {
    // Update the "Calculate & Draw Arrays" button text
    const calculateButton = $('#calculate-arrays');
    if (calculateButton.length) {
        calculateButton.html('<i class="fas fa-calculator"></i> Calculate & Draw Panels');
    }

    // Check if essential libraries are loaded
    if (typeof mapboxgl === 'undefined') {
        alert('Mapbox GL JS is not loaded. Please check your internet connection and try again.');
        return;
    }
    
    if (typeof turf === 'undefined') {
        alert('Turf.js is not loaded. Please check your internet connection and try again.');
        return;
    }
    
    console.log("Required libraries loaded:", {
        mapboxgl: typeof mapboxgl,
        turf: typeof turf,
        MapboxDraw: typeof MapboxDraw
    });
    
    // Instantiate controllers
    const mapController = new MapController();
    let drawingTools, solarCalculator, exportManager;

    // Initialize map and then setup modules and event handlers
    mapController.initMap()
        .then(() => {
            console.log("Map initialized successfully");
            
            // Initialize tools after map is ready
            drawingTools = new DrawingTools(mapController);
            // Delay initialization to ensure map is fully loaded
            setTimeout(() => {
                drawingTools.initializeDrawControl();
                console.log("Drawing tools initialized");
            }, 500);
            
            solarCalculator = new SolarCalculator(mapController);
            exportManager = new ExportManager(mapController, solarCalculator);

            // Map click event for remove mode
            mapController.map.on('click', (e) => {
                if (drawingTools.removeMode) {
                    drawingTools.removePolygonAtPoint(e.lngLat);
                }
            });

            // Button event handlers
            $('#draw-polygon').click(() => {
                drawingTools.setDrawMode(!drawingTools.drawMode);
            });

            $('#subtract-inner').click(() => {
                drawingTools.setSubtractMode(!drawingTools.subtractMode);
            });
            
            $('#remove-area').click(() => {
                drawingTools.setRemoveMode(!drawingTools.removeMode);
            });
            
            $('#clear-all').click(() => {
                if (confirm('Are you sure you want to clear all drawn areas?')) {
                    drawingTools.clearAll();
                }
            });
            
            $('#calculate-arrays').click(() => {
                if (mapController.polygons.length === 0) {
                    alert('Please draw at least one polygon area first.');
                    return;
                }
                
                try {
                    // Show loading indicator
                    const loadingId = 'panel-calculation-indicator';
                    $('body').append(`<div id="${loadingId}" class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded shadow-lg z-50">Calculating panels...</div>`);
                    
                    // Track map state for debugging
                    console.log("Map ready state:", mapController.isMapReady);
                    
                    // Make sure map is fully ready before calculating
                    if (!mapController.isMapReady) {
                        console.warn("Map not fully ready, waiting...");
                        setTimeout(() => {
                            mapController.isMapReady = true;
                        }, 1000);
                    }
                    
                    // Calculate the panels with a slight delay to allow UI updates
                    setTimeout(() => {
                        try {
                            // Clear any existing panels first
                            mapController.clearPanelVisualization();
                            
                            // Force map refresh
                            mapController.triggerRepaint();
                            
                            // Then calculate and display panels
                            solarCalculator.calculatePanelsOnly();
                            console.log("Panels calculation completed");
                        } catch (e) {
                            console.error("Error in panel calculation:", e);
                        } finally {
                            // Remove loading indicator regardless of success/failure
                            $(`#${loadingId}`).remove();
                        }
                    }, 300);
                } catch (error) {
                    console.error("Error in calculate-arrays click handler:", error);
                    alert("Error calculating panels. Please try again.");
                }
            });
            
            // Keyboard shortcuts (only when not editing inputs)
            $(document).keydown((e) => {
                if (e.target.tagName === 'INPUT') return;
                switch (e.key) {
                    case 'd':
                        drawingTools.setDrawMode(!drawingTools.drawMode);
                        break;
                    case 'r':
                        drawingTools.setRemoveMode(!drawingTools.removeMode);
                        break;
                    case 's':
                        drawingTools.setSubtractMode(!drawingTools.subtractMode);
                        break;
                    case 'c':
                        if (confirm('Clear all drawn areas?')) {
                            drawingTools.clearAll();
                        }
                        break;
                    case 'Escape':
                        // Cancel all active modes
                        drawingTools.setDrawMode(false);
                        drawingTools.setRemoveMode(false);
                        drawingTools.setSubtractMode(false);
                        break;
                }
            });
        })
        .catch(error => {
            console.error('Map could not be initialized:', error);
            alert('Failed to initialize map.');
        });
});
