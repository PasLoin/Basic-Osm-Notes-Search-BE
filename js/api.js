// ===================================
// OSM API Communication
// ===================================

const APIManager = {
    currentAbortController: null,
    
    /**
     * Search for notes using the OSM API
     * @param {Object} params - Search parameters
     * @returns {Promise<Object>} API response data
     */
    async searchNotes(params) {
        try {
            // Cancel any ongoing request
            if (this.currentAbortController) {
                this.currentAbortController.abort();
            }
            
            // Create new abort controller
            this.currentAbortController = new AbortController();
            
            // Build query parameters
            const queryParams = this.buildQueryParams(params);
            
            // Construct API URL
            const url = `${CONFIG.API_BASE_URL}/notes/search.json?${queryParams}`;
            
            console.log('API Request:', url);
            
            // Make API request
            const response = await fetch(url, {
                method: 'GET',
                signal: this.currentAbortController.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            // Check response status
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            
            // Parse JSON response
            const data = await response.json();
            
            // Filter by desired status
            const filtered = this.filterByStatus(data, params);
            
            console.log('API Response:', {
                total: data.features?.length || 0,
                filtered: filtered.features?.length || 0,
                status: params.closed === '0' ? 'open' : 'closed'
            });
            
            return filtered;
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request was cancelled');
                throw new Error('Request cancelled');
            }
            
            console.error('API Error:', error);
            throw error;
        }
    },
    
    /**
     * Build query parameters for API request
     * @param {Object} params - Raw form parameters
     * @returns {URLSearchParams} Formatted query parameters
     */
    buildQueryParams(params) {
        const queryParams = new URLSearchParams();
        
        // Text search query
        if (params.q && params.q.trim()) {
            queryParams.append('q', params.q.trim());
        }
        
        // Limit (default to CONFIG.DEFAULT_LIMIT)
        const limit = params.limit || CONFIG.DEFAULT_LIMIT;
        queryParams.append('limit', Math.min(limit, CONFIG.MAX_LIMIT));
        
        // Display name (user filter)
        if (params.display_name && params.display_name.trim()) {
            queryParams.append('display_name', params.display_name.trim());
        }
        
        // Bounding box
        if (params.bbox && params.bbox.trim()) {
            queryParams.append('bbox', params.bbox.trim());
        }
        
        // Date range
        if (params.from) {
            queryParams.append('from', params.from);
        }
        
        if (params.to) {
            queryParams.append('to', params.to);
        }
        
        // Closed parameter (0 for open only, positive number for closed up to X days ago)
        const closed = params.closed || '0';
        queryParams.append('closed', closed);
        
        return queryParams;
    },
    
    /**
     * Filter results by status
     * @param {Object} data - API response data
     * @param {Object} params - Search parameters
     * @returns {Object} Filtered data
     */
    filterByStatus(data, params) {
        if (!data.features || !Array.isArray(data.features)) {
            return { ...data, features: [] };
        }
        
        // Determine desired status
        const desiredStatus = params.closed === '0' ? 'open' : 'closed';
        
        // Filter features
        const filtered = data.features.filter(feature => 
            feature.properties && feature.properties.status === desiredStatus
        );
        
        return {
            ...data,
            features: filtered
        };
    },
    
    /**
     * Sort features by various criteria
     * @param {Array} features - Array of GeoJSON features
     * @param {String} sortBy - Sort criteria
     * @returns {Array} Sorted features
     */
    sortFeatures(features, sortBy) {
        if (!features || !Array.isArray(features)) {
            return [];
        }
        
        const sorted = [...features];
        
        switch (sortBy) {
            case 'date_desc':
                sorted.sort((a, b) => 
                    new Date(b.properties.date_created) - new Date(a.properties.date_created)
                );
                break;
                
            case 'date_asc':
                sorted.sort((a, b) => 
                    new Date(a.properties.date_created) - new Date(b.properties.date_created)
                );
                break;
                
            case 'comments_desc':
                sorted.sort((a, b) => 
                    (b.properties.comments?.length || 0) - (a.properties.comments?.length || 0)
                );
                break;
                
            case 'comments_asc':
                sorted.sort((a, b) => 
                    (a.properties.comments?.length || 0) - (b.properties.comments?.length || 0)
                );
                break;
                
            default:
                // No sorting
                break;
        }
        
        return sorted;
    },
    
    /**
     * Calculate statistics from features
     * @param {Array} features - Array of GeoJSON features
     * @returns {Object} Statistics object
     */
    calculateStats(features) {
        if (!features || !Array.isArray(features)) {
            return {
                total: 0,
                open: 0,
                closed: 0,
                avgComments: 0
            };
        }
        
        const stats = {
            total: features.length,
            open: 0,
            closed: 0,
            totalComments: 0
        };
        
        features.forEach(feature => {
            if (feature.properties) {
                if (feature.properties.status === 'open') {
                    stats.open++;
                } else if (feature.properties.status === 'closed') {
                    stats.closed++;
                }
                
                if (feature.properties.comments) {
                    stats.totalComments += feature.properties.comments.length;
                }
            }
        });
        
        stats.avgComments = stats.total > 0 
            ? (stats.totalComments / stats.total).toFixed(1) 
            : 0;
        
        return stats;
    },
    
    /**
     * Cancel current request
     */
    cancelRequest() {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
        }
    },
    
    /**
     * Validate search parameters
     * @param {Object} params - Search parameters
     * @returns {Object} {valid: boolean, errors: Array}
     */
    validateParams(params) {
        const errors = [];
        
        // Check if at least one search criterion is provided
        const hasQuery = params.q && params.q.trim();
        const hasUser = params.display_name && params.display_name.trim();
        const hasDateRange = params.from || params.to;
        const hasBbox = params.bbox && params.bbox.trim();
        
        // Validate limit
        if (params.limit) {
            const limit = parseInt(params.limit, 10);
            if (isNaN(limit) || limit < 1) {
                errors.push('Limit must be a positive number');
            } else if (limit > CONFIG.MAX_LIMIT) {
                errors.push(`Maximum limit is ${CONFIG.MAX_LIMIT}`);
            }
        }
        
        // Validate date range
        if (params.from && params.to) {
            const fromDate = new Date(params.from);
            const toDate = new Date(params.to);
            
            if (fromDate > toDate) {
                errors.push('Start date must be before end date');
            }
        }
        
        // Validate bbox format
        if (params.bbox) {
            const bboxParts = params.bbox.split(',');
            if (bboxParts.length !== 4 || bboxParts.some(part => isNaN(parseFloat(part)))) {
                errors.push('Invalid bounding box format (expected: lng1,lat1,lng2,lat2)');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
};
