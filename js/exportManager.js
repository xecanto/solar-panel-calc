class ExportManager {
    constructor(mapController, solarCalculator) {
        this.mapController = mapController;
        this.solarCalculator = solarCalculator;
        
        // Set up the export button click handler
        $(document).on('click', '#export-design', () => this.exportDesign());
    }
    
    exportDesign() {
        if (this.mapController.polygons.length === 0) {
            alert('Please draw some areas first.');
            return;
        }
        
        const designData = {
            timestamp: new Date().toISOString(),
            polygons: this.mapController.polygons,
            solarArrays: this.mapController.solarArrays,
            settings: {
                panelWidth: parseFloat($('#panel-width').val()),
                panelHeight: parseFloat($('#panel-height').val()),
                hPanelSpacing: parseFloat($('#h-panel-spacing').val()),
                vPanelSpacing: parseFloat($('#v-panel-spacing').val()),
                panelsPerRow: parseInt($('#panels-per-row').val()),
                rowsPerArray: parseInt($('#rows-per-array').val()),
                hArraySpacing: parseFloat($('#h-array-spacing').val()),
                vArraySpacing: parseFloat($('#v-array-spacing').val()),
                azimuthAngle: parseFloat($('#azimuth-angle').val()),
                zenithAngle: parseFloat($('#zenith-angle').val())
            },
            results: {
                totalArea: parseFloat($('#total-area').text()),
                totalArrays: parseInt($('#total-arrays').text()),
                totalPanels: parseInt($('#total-panels').text()),
                estimatedCapacity: parseFloat($('#estimated-capacity').text())
            }
        };
        
        // Create and download the file
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(designData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "solar-array-design.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
}
