// ===================================
// Map Management with Clustering
// ===================================

const MapManager = {
    map: null,
    markerClusterGroup: null,
    clusteringEnabled: true,
    currentMarkers: [],
    
    /**
     * Initialize the map
     */
    init() {
        // Create map instance
        this.map = L.map('map').setView(CONFIG.MAP.CENTER, CONFIG.MAP.ZOOM);
        
        // Add tile layer
        L.tileLayer(CONFIG.TILES.URL, {
            attribution: CONFIG.TILES.ATTRIBUTION,
            maxZoom: CONFIG.TILES.MAX_ZOOM,
            minZoom: CONFIG.MAP.MIN_ZOOM
        }).addTo(this.map);
        
        // Initialize marker cluster group
        this.initializeClusterGroup();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set map bounds to Belgium
        this.resetBounds();
        
        return this.map;
    },
    
    /**
     * Initialize marker cluster group
     */
    initializeClusterGroup() {
        this.markerClusterGroup = L.markerClusterGroup({
            maxClusterRadius: CONFIG.CLUSTER.MAX_RADIUS,
            spiderfyOnMaxZoom: CONFIG.CLUSTER.SPIDERFY_ON_MAX_ZOOM,
            showCoverageOnHover: CONFIG.CLUSTER.SHOW_COVERAGE_ON_HOVER,
            zoomToBoundsOnClick: CONFIG.CLUSTER.ZOOM_TO_BOUNDS_ON_CLICK,
            disableClusteringAtZoom: CONFIG.CLUSTER.DISABLE_AT_ZOOM,
            animate: CONFIG.CLUSTER.ANIMATE,
            
            // Custom cluster icon
            iconCreateFunction: (cluster) => {
                const count = cluster.getChildCount();
                let className = 'marker-cluster-';
                
                if (count < 10) {
                    className += 'small';
                } else if (count < 100) {
                    className += 'medium';
                } else {
                    className += 'large';
                }
                
                return L.divIcon({
                    html: `<div><span>${count}</span></div>`,
                    className: 'marker-cluster ' + className,
                    iconSize: L.point(40, 40)
                });
            }
        });
        
        // Add cluster group to map
        this.map.addLayer(this.markerClusterGroup);
    },
    
    /**
     * Set up map event listeners
     */
    setupEventListeners() {
        // Update bbox on map move
        this.map.on('moveend', () => {
            this.updateBboxInput();
        });
        
        // Cluster click event
        this.markerClusterGroup.on('clusterclick', (cluster) => {
            console.log('Cluster clicked:', cluster.layer.getAllChildMarkers().length, 'markers');
        });
    },
    
    /**
     * Update bbox input field with current map bounds
     */
    updateBboxInput() {
        const bounds = this.map.getBounds();
        const bbox = [
            bounds.getSouthWest().lng.toFixed(6),
            bounds.getSouthWest().lat.toFixed(6),
            bounds.getNorthEast().lng.toFixed(6),
            bounds.getNorthEast().lat.toFixed(6)
        ].join(',');
        
        const bboxInput = document.getElementById('bbox');
        if (bboxInput) {
            bboxInput.value = bbox;
        }
    },
    
    /**
     * Display notes on the map
     * @param {Array} features - GeoJSON features array
     */
    displayNotes(features) {
        // Clear existing markers
        this.clearMarkers();
        
        // Reset current markers array
        this.currentMarkers = [];
        
        // Add markers to cluster group
        features.forEach(feature => {
            const marker = this.createMarker(feature);
            if (marker) {
                if (this.clusteringEnabled) {
                    this.markerClusterGroup.addLayer(marker);
                } else {
                    marker.addTo(this.map);
                }
                this.currentMarkers.push(marker);
            }
        });
        
        // Fit bounds to show all markers if there are any
        if (features.length > 0) {
            this.fitBounds();
        }
    },
    
    /**
     * Create a marker for a note
     * @param {Object} feature - GeoJSON feature
     * @returns {L.Marker} Leaflet marker
     */
    createMarker(feature) {
        const { coordinates } = feature.geometry;
        const { status } = feature.properties;
        
        // Create custom icon based on status
        const iconConfig = status === 'open' ? CONFIG.ICONS.OPEN : CONFIG.ICONS.CLOSED;
        const icon = L.icon(iconConfig);
        
        // Create marker
        const marker = L.marker([coordinates[1], coordinates[0]], { icon });
        
        // Create and bind popup
        const popupContent = this.createPopupContent(feature);
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });
        
        // Store feature data on marker
        marker.feature = feature;
        
        return marker;
    },
    
    /**
     * Create popup content for a note
     * @param {Object} feature - GeoJSON feature
     * @returns {String} HTML content
     */
    createPopupContent(feature) {
        const { id, status, date_created, comments } = feature.properties;
        
        let html = `
            <div class="popup-header">
                <strong>OSM Note #${id}</strong>
                <span class="popup-status ${status}">${status === 'open' ? 'Open' : 'Closed'}</span>
            </div>
            <div>
                <strong>Created:</strong> ${this.formatDate(date_created)}<br>
                <strong>Link:</strong> <a href="https://www.openstreetmap.org/note/${id}" target="_blank" rel="noopener">View on OSM</a>
            </div>
            <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
            <div style="max-height: 200px; overflow-y: auto;">
        `;
        
        // Add comments
        if (comments && comments.length > 0) {
            comments.forEach(comment => {
                html += `
                    <div class="popup-comment">
                        <div class="popup-user">${this.escapeHtml(comment.user || 'Anonymous')}</div>
                        <div>${this.escapeHtml(comment.text)}</div>
                        <div class="popup-date">${this.formatDate(comment.date)}</div>
                    </div>
                `;
            });
        } else {
            html += '<p><em>No comments</em></p>';
        }
        
        html += '</div>';
        return html;
    },
    
    /**
     * Format date string
     * @param {String} dateStr - ISO date string
     * @returns {String} Formatted date
     */
    formatDate(dateStr) {
        if (!dateStr) return 'Unknown date';
        
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateStr;
        }
    },
    
    /**
     * Escape HTML to prevent XSS
     * @param {String} text - Text to escape
     * @returns {String} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Clear all markers from the map
     */
    clearMarkers() {
        if (this.markerClusterGroup) {
            this.markerClusterGroup.clearLayers();
        }
        
        // Remove individual markers if clustering is disabled
        this.currentMarkers.forEach(marker => {
            if (this.map.hasLayer(marker)) {
                this.map.removeLayer(marker);
            }
        });
        
        this.currentMarkers = [];
    },
    
    /**
     * Fit map bounds to show all markers
     */
    fitBounds() {
        if (this.currentMarkers.length === 0) return;
        
        if (this.clusteringEnabled && this.markerClusterGroup) {
            const bounds = this.markerClusterGroup.getBounds();
            if (bounds.isValid()) {
                this.map.fitBounds(bounds, { padding: [50, 50] });
            }
        } else if (this.currentMarkers.length > 0) {
            const group = L.featureGroup(this.currentMarkers);
            this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }
    },
    
    /**
     * Reset map to Belgium bounds
     */
    resetBounds() {
        this.map.fitBounds(CONFIG.MAP.BELGIUM_BOUNDS);
        this.updateBboxInput();
    },
    
    /**
     * Toggle clustering on/off
     */
    toggleClustering() {
        this.clusteringEnabled = !this.clusteringEnabled;
        
        if (this.clusteringEnabled) {
            // Re-enable clustering
            this.currentMarkers.forEach(marker => {
                if (this.map.hasLayer(marker)) {
                    this.map.removeLayer(marker);
                }
                this.markerClusterGroup.addLayer(marker);
            });
            
            if (!this.map.hasLayer(this.markerClusterGroup)) {
                this.map.addLayer(this.markerClusterGroup);
            }
        } else {
            // Disable clustering
            this.markerClusterGroup.clearLayers();
            this.currentMarkers.forEach(marker => {
                marker.addTo(this.map);
            });
        }
        
        return this.clusteringEnabled;
    },
    
    /**
     * Get current map center
     * @returns {Object} {lat, lng}
     */
    getCenter() {
        const center = this.map.getCenter();
        return {
            lat: center.lat,
            lng: center.lng
        };
    },
    
    /**
     * Get current zoom level
     * @returns {Number}
     */
    getZoom() {
        return this.map.getZoom();
    },
    
    /**
     * Get current bounds as bbox string
     * @returns {String}
     */
    getBbox() {
        const bounds = this.map.getBounds();
        return [
            bounds.getSouthWest().lng.toFixed(6),
            bounds.getSouthWest().lat.toFixed(6),
            bounds.getNorthEast().lng.toFixed(6),
            bounds.getNorthEast().lat.toFixed(6)
        ].join(',');
    }
};
