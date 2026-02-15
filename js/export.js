// ===================================
// Export Functionality
// ===================================

const ExportManager = {
    /**
     * Initialize export button listeners
     */
    init() {
        document.getElementById('exportJSON').addEventListener('click', () => {
            this.exportToJSON();
        });
        
        document.getElementById('exportGeoJSON').addEventListener('click', () => {
            this.exportToGeoJSON();
        });
        
        document.getElementById('exportCSV').addEventListener('click', () => {
            this.exportToCSV();
        });
    },
    
    /**
     * Export search results to JSON
     */
    exportToJSON() {
        try {
            const data = UIManager.searchResults;
            
            if (!data || data.length === 0) {
                UIManager.showError('No data to export');
                return;
            }
            
            const jsonString = JSON.stringify(data, null, CONFIG.EXPORT.JSON_INDENT);
            const filename = this.generateFilename('notes', 'json');
            
            this.downloadFile(jsonString, filename, 'application/json');
            UIManager.showSuccess(`File ${filename} downloaded`);
            
        } catch (error) {
            console.error('Export JSON error:', error);
            UIManager.showError('Error exporting JSON');
        }
    },
    
    /**
     * Export search results to GeoJSON
     */
    exportToGeoJSON() {
        try {
            const data = UIManager.searchResults;
            
            if (!data || data.length === 0) {
                UIManager.showError('No data to export');
                return;
            }
            
            const geojson = {
                type: "FeatureCollection",
                features: data,
                metadata: {
                    generated: new Date().toISOString(),
                    count: data.length,
                    source: "OpenStreetMap Notes API",
                    generator: "OSM Notes Search Belgium"
                }
            };
            
            const jsonString = JSON.stringify(geojson, null, CONFIG.EXPORT.JSON_INDENT);
            const filename = this.generateFilename('notes', 'geojson');
            
            this.downloadFile(jsonString, filename, 'application/geo+json');
            UIManager.showSuccess(`File ${filename} downloaded`);
            
        } catch (error) {
            console.error('Export GeoJSON error:', error);
            UIManager.showError('Error exporting GeoJSON');
        }
    },
    
    /**
     * Export search results to CSV
     */
    exportToCSV() {
        try {
            const data = UIManager.searchResults;
            
            if (!data || data.length === 0) {
                UIManager.showError('No data to export');
                return;
            }
            
            const csv = this.convertToCSV(data);
            const filename = this.generateFilename('notes', 'csv');
            
            // Add BOM for Excel compatibility with UTF-8
            const bom = '\uFEFF';
            this.downloadFile(bom + csv, filename, 'text/csv;charset=utf-8;');
            UIManager.showSuccess(`File ${filename} downloaded`);
            
        } catch (error) {
            console.error('Export CSV error:', error);
            UIManager.showError('Error exporting CSV');
        }
    },
    
    /**
     * Convert features to CSV format
     * @param {Array} features - Array of GeoJSON features
     * @returns {String} CSV string
     */
    convertToCSV(features) {
        const delimiter = CONFIG.EXPORT.CSV_DELIMITER;
        
        // Define CSV headers
        const headers = [
            'ID',
            'Status',
            'Latitude',
            'Longitude',
            'Created date',
            'Closed date',
            'Number of comments',
            'First comment',
            'Last comment',
            'Users',
            'OSM link'
        ];
        
        // Build CSV rows
        const rows = features.map(feature => {
            const props = feature.properties;
            const coords = feature.geometry.coordinates;
            const comments = props.comments || [];
            
            // Extract user names
            const users = [...new Set(
                comments
                    .map(c => c.user)
                    .filter(u => u)
            )].join('; ');
            
            // Get first and last comment
            const firstComment = comments.length > 0 
                ? this.cleanText(comments[0].text) 
                : '';
            const lastComment = comments.length > 0 
                ? this.cleanText(comments[comments.length - 1].text) 
                : '';
            
            return [
                props.id || '',
                props.status || '',
                coords[1] || '', // latitude
                coords[0] || '', // longitude
                props.date_created || '',
                props.closed_at || '',
                comments.length,
                firstComment,
                lastComment,
                users,
                `https://www.openstreetmap.org/note/${props.id}`
            ];
        });
        
        // Combine headers and rows
        const csvContent = [
            headers.join(delimiter),
            ...rows.map(row => row.map(cell => this.escapeCSV(cell)).join(delimiter))
        ].join('\n');
        
        return csvContent;
    },
    
    /**
     * Clean text for CSV (remove line breaks, extra spaces)
     * @param {String} text - Text to clean
     * @returns {String} Cleaned text
     */
    cleanText(text) {
        if (!text) return '';
        return text
            .replace(/[\n\r]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },
    
    /**
     * Escape CSV cell content
     * @param {String} cell - Cell content
     * @returns {String} Escaped content
     */
    escapeCSV(cell) {
        if (cell === null || cell === undefined) {
            return '';
        }
        
        const cellStr = String(cell);
        
        // If cell contains delimiter, quotes, or newlines, wrap in quotes
        if (cellStr.includes(CONFIG.EXPORT.CSV_DELIMITER) || 
            cellStr.includes('"') || 
            cellStr.includes('\n')) {
            return '"' + cellStr.replace(/"/g, '""') + '"';
        }
        
        return cellStr;
    },
    
    /**
     * Generate filename with timestamp
     * @param {String} prefix - Filename prefix
     * @param {String} extension - File extension
     * @returns {String} Generated filename
     */
    generateFilename(prefix, extension) {
        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/:/g, '-')
            .replace(/\..+/, '')
            .replace('T', '_');
        
        return `${prefix}_${timestamp}.${extension}`;
    },
    
    /**
     * Download file to user's computer
     * @param {String} content - File content
     * @param {String} filename - Filename
     * @param {String} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    },
    
    /**
     * Get export statistics
     * @returns {Object} Export stats
     */
    getExportStats() {
        const data = UIManager.searchResults;
        
        if (!data || data.length === 0) {
            return null;
        }
        
        const stats = APIManager.calculateStats(data);
        
        return {
            totalNotes: stats.total,
            openNotes: stats.open,
            closedNotes: stats.closed,
            avgComments: stats.avgComments,
            exportDate: new Date().toISOString()
        };
    }
};
