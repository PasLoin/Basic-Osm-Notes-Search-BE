// ===================================
// Local Storage Management
// ===================================

const StorageManager = {
    /**
     * Save a search to recent searches
     * @param {Object} searchParams - The search parameters
     */
    saveSearch(searchParams) {
        try {
            const searches = this.getRecentSearches();
            
            // Create search object with timestamp
            const searchObject = {
                params: searchParams,
                timestamp: Date.now(),
                label: this.generateSearchLabel(searchParams)
            };
            
            // Remove duplicates (same params)
            const filtered = searches.filter(s => 
                JSON.stringify(s.params) !== JSON.stringify(searchParams)
            );
            
            // Add new search at the beginning
            filtered.unshift(searchObject);
            
            // Keep only MAX_RECENT searches
            const limited = filtered.slice(0, CONFIG.STORAGE.MAX_RECENT);
            
            // Save to localStorage
            localStorage.setItem(
                CONFIG.STORAGE.RECENT_SEARCHES, 
                JSON.stringify(limited)
            );
            
            return true;
        } catch (error) {
            console.error('Error saving search:', error);
            return false;
        }
    },
    
    /**
     * Get recent searches from localStorage
     * @returns {Array} Array of recent searches
     */
    getRecentSearches() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE.RECENT_SEARCHES);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error getting recent searches:', error);
            return [];
        }
    },
    
    /**
     * Clear all recent searches
     */
    clearRecentSearches() {
        try {
            localStorage.removeItem(CONFIG.STORAGE.RECENT_SEARCHES);
            return true;
        } catch (error) {
            console.error('Error clearing recent searches:', error);
            return false;
        }
    },
    
    /**
     * Generate a readable label for a search
     * @param {Object} params - Search parameters
     * @returns {String} Human-readable search label
     */
    generateSearchLabel(params) {
        const parts = [];
        
        if (params.q) {
            parts.push(`"${params.q}"`);
        }
        
        if (params.display_name) {
            parts.push(`by ${params.display_name}`);
        }
        
        if (params.from || params.to) {
            const dateRange = [];
            if (params.from) dateRange.push(`from ${params.from}`);
            if (params.to) dateRange.push(`to ${params.to}`);
            parts.push(dateRange.join(' '));
        }
        
        const status = params.closed === '0' ? 'open' : 'closed';
        parts.push(status);
        
        return parts.length > 0 ? parts.join(' • ') : 'Search without filters';
    },
    
    /**
     * Get the current theme
     * @returns {String} 'light' or 'dark'
     */
    getTheme() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE.THEME);
            if (stored) {
                return stored;
            }
            
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
            
            return 'light';
        } catch (error) {
            console.error('Error getting theme:', error);
            return 'light';
        }
    },
    
    /**
     * Save theme preference
     * @param {String} theme - 'light' or 'dark'
     */
    saveTheme(theme) {
        try {
            localStorage.setItem(CONFIG.STORAGE.THEME, theme);
            return true;
        } catch (error) {
            console.error('Error saving theme:', error);
            return false;
        }
    },
    
    /**
     * Toggle theme between light and dark
     * @returns {String} The new theme
     */
    toggleTheme() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.saveTheme(newTheme);
        return newTheme;
    },
    
    /**
     * Format timestamp for display
     * @param {Number} timestamp - Unix timestamp
     * @returns {String} Formatted relative time
     */
    formatTimestamp(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} min ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-GB');
    },
    
    /**
     * Check if localStorage is available
     * @returns {Boolean}
     */
    isAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
};

// Listen to system theme changes
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(CONFIG.STORAGE.THEME)) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
        }
    });
}
