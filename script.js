mapboxgl.accessToken = 'pk.eyJ1IjoiaWxpeWFuLWhpcmFuaSIsImEiOiJjbThmNHRxMDMwYTJ2MmpxdHAzbDZxOTNuIn0.nw9ek8mR679n6H-C-Ydhzg';

// Initialize Mapbox
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-v9',
    center: [-91.874, 42.76],
    zoom: 12
});

// Initialize Mapbox Draw
const draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {
        polygon: true,
        trash: true
    }
});
map.addControl(draw);

// Event listeners for polygon drawing
map.on('draw.create', updateArea);
map.on('draw.delete', updateArea);
map.on('draw.update', updateArea);

function updateArea(e) {
    const data = draw.getAll();
    const answer = document.getElementById('calculated-area');
    const panelCount = document.getElementById('panel-count');
    
    if (data.features.length > 0) {
        const area = turf.area(data);
        const rounded_area = Math.round(area * 100) / 100;
        answer.innerHTML = `<p class="text-lg">${rounded_area} square meters</p>`;
        panelCount.innerHTML = '';
    } else {
        answer.innerHTML = '';
        panelCount.innerHTML = '';
        if (e.type !== 'draw.delete')
            alert('Click the map to draw a polygon.');
    }
}

// Subtract Inner Polygon from Outer Polygon
document.getElementById("subtract-area").addEventListener("click", () => {
    const data = draw.getAll();
    if (data.features.length < 2) return alert("Draw at least two polygons!");

    let outerPolygon = data.features[0];
    let innerPolygon = data.features[1];

    let result = turf.difference(outerPolygon, innerPolygon);
    if (!result) return alert("Subtraction resulted in an empty shape!");

    draw.deleteAll();
    draw.add(result);
});

// Improved Autofill Polygon with Solar Panel Arrays
document.getElementById("autofill").addEventListener("click", () => {
    const data = draw.getAll();
    if (data.features.length === 0) return alert("Draw a polygon first!");

    let polygon = data.features[0];

    // Get user input for panel and array configuration
    let panelWidth = parseFloat(prompt("Enter Solar Panel Width (meters):", "1.0"));
    let panelHeight = parseFloat(prompt("Enter Solar Panel Height (meters):", "1.7"));
    let panelSpacingX = parseFloat(prompt("Enter Spacing Between Panels in a Row (meters):", "0.1"));
    let panelSpacingY = parseFloat(prompt("Enter Spacing Between Panels in a Column (meters):", "0.1"));
    
    let panelsPerRow = parseInt(prompt("Enter Number of Panels per Row in each Array:", "3"));
    let panelsPerColumn = parseInt(prompt("Enter Number of Panels per Column in each Array:", "5"));
    
    let arraySpacingX = parseFloat(prompt("Enter Spacing Between Arrays Horizontally (meters):", "2.0"));
    let arraySpacingY = parseFloat(prompt("Enter Spacing Between Arrays Vertically (meters):", "2.5"));

    // Validate all inputs
    if (isNaN(panelWidth) || isNaN(panelHeight) || 
        isNaN(panelSpacingX) || isNaN(panelSpacingY) ||
        isNaN(panelsPerRow) || isNaN(panelsPerColumn) ||
        isNaN(arraySpacingX) || isNaN(arraySpacingY) ||
        panelWidth <= 0 || panelHeight <= 0 || 
        panelSpacingX < 0 || panelSpacingY < 0 ||
        panelsPerRow <= 0 || panelsPerColumn <= 0 ||
        arraySpacingX < 0 || arraySpacingY < 0) {
        alert("Invalid input! Please enter positive numbers.");
        return;
    }

    // Calculate the polygon's bounds
    let bbox = turf.bbox(polygon);
    let [minLng, minLat, maxLng, maxLat] = bbox;
    
    // Find the center of the polygon for better panel placement
    const center = turf.centroid(polygon);
    const centerLat = center.geometry.coordinates[1];
    
    // Convert meters to degrees function
    const metersToDegrees = (meters, lat) => {
        const earthRadius = 6378137; // Earth's radius in meters
        const latFactor = 180 / Math.PI / earthRadius;
        return meters * latFactor / Math.cos(lat * Math.PI / 180);
    };

    // Calculate dimensions in degrees
    const panelWidthDeg = metersToDegrees(panelWidth, centerLat);
    const panelHeightDeg = metersToDegrees(panelHeight, centerLat);
    const panelSpacingXDeg = metersToDegrees(panelSpacingX, centerLat);
    const panelSpacingYDeg = metersToDegrees(panelSpacingY, centerLat);
    const arraySpacingXDeg = metersToDegrees(arraySpacingX, centerLat);
    const arraySpacingYDeg = metersToDegrees(arraySpacingY, centerLat);
    
    // Calculate single array dimensions
    const arrayWidthDeg = (panelsPerRow * panelWidthDeg) + ((panelsPerRow - 1) * panelSpacingXDeg);
    const arrayHeightDeg = (panelsPerColumn * panelHeightDeg) + ((panelsPerColumn - 1) * panelSpacingYDeg);
    
    // Calculate the distance between array origins (including array size and spacing)
    const arrayStrideXDeg = arrayWidthDeg + arraySpacingXDeg;
    const arrayStrideYDeg = arrayHeightDeg + arraySpacingYDeg;
    
    // Calculate how many arrays can fit in the polygon
    const polygonWidth = maxLng - minLng;
    const polygonHeight = maxLat - minLat;
    
    const arraysInX = Math.floor(polygonWidth / arrayStrideXDeg);
    const arraysInY = Math.floor(polygonHeight / arrayStrideYDeg);
    
    // If no arrays can fit, exit
    if (arraysInX <= 0 || arraysInY <= 0) {
        alert("The polygon is too small to fit any panel arrays with the given dimensions and spacing.");
        return;
    }
    
    // Calculate the starting point to center the arrays in the polygon
    const extraWidthSpace = polygonWidth - (arraysInX * arrayStrideXDeg - arraySpacingXDeg);
    const extraHeightSpace = polygonHeight - (arraysInY * arrayStrideYDeg - arraySpacingYDeg);
    
    const startLng = minLng + extraWidthSpace / 2;
    const startLat = minLat + extraHeightSpace / 2;
    
    // Create arrays of panels
    let allPanels = [];
    let totalArrays = 0;
    let totalPanels = 0;
    
    for (let arrayX = 0; arrayX < arraysInX; arrayX++) {
        for (let arrayY = 0; arrayY < arraysInY; arrayY++) {
            // Calculate the origin of this array
            const arrayOriginLng = startLng + (arrayX * arrayStrideXDeg);
            const arrayOriginLat = startLat + (arrayY * arrayStrideYDeg);
            
            // Check if the array's center is within the polygon
            const arrayCenter = turf.point([
                arrayOriginLng + (arrayWidthDeg / 2),
                arrayOriginLat + (arrayHeightDeg / 2)
            ]);
            
            if (!turf.booleanPointInPolygon(arrayCenter.geometry.coordinates, polygon.geometry)) {
                continue; // Skip this array if its center is outside the polygon
            }
            
            totalArrays++;
            let arrayPanels = [];
            
            // Create panels within this array
            for (let panelRow = 0; panelRow < panelsPerRow; panelRow++) {
                for (let panelCol = 0; panelCol < panelsPerColumn; panelCol++) {
                    // Calculate the origin of this panel within the array
                    const panelLng = arrayOriginLng + (panelRow * (panelWidthDeg + panelSpacingXDeg));
                    const panelLat = arrayOriginLat + (panelCol * (panelHeightDeg + panelSpacingYDeg));
                    
                    // Create the panel polygon
                    let panel = turf.polygon([[
                        [panelLng, panelLat],
                        [panelLng + panelWidthDeg, panelLat],
                        [panelLng + panelWidthDeg, panelLat + panelHeightDeg],
                        [panelLng, panelLat + panelHeightDeg],
                        [panelLng, panelLat]  // Close the polygon
                    ]]);
                    
                    // Check if the panel's center is within the drawn polygon
                    const panelCenter = turf.centroid(panel);
                    if (turf.booleanPointInPolygon(panelCenter.geometry.coordinates, polygon.geometry)) {
                        arrayPanels.push(panel);
                        totalPanels++;
                    }
                }
            }
            
            // Add all panels from this array
            allPanels = allPanels.concat(arrayPanels);
        }
    }
    
    if (allPanels.length === 0) {
        alert("No panels fit within the polygon.");
        return;
    }
    
    // Display panel count and array information
    const panelCountElement = document.getElementById('panel-count');
    const totalPanelArea = totalPanels * panelWidth * panelHeight;
    const singleArrayPanels = panelsPerRow * panelsPerColumn;
    
    panelCountElement.innerHTML = `
        <p><strong>Total Panels:</strong> ${totalPanels}</p>
        <p><strong>Panel Arrays:</strong> ${totalArrays}</p>
        <p><strong>Panels per Array:</strong> ${singleArrayPanels} (${panelsPerRow} × ${panelsPerColumn})</p>
        <p><strong>Total Panel Area:</strong> ${Math.round(totalPanelArea * 100) / 100} m²</p>
    `;
    
    // Clear the current drawings and add the polygon and panels
    draw.deleteAll();
    draw.add(polygon);
    allPanels.forEach(panel => draw.add(panel));
});