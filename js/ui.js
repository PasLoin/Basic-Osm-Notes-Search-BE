// ===================================
// User Interface Management
// ===================================

const UIManager = {
    searchResults: [],
    
    /**
     * Initialize UI components and event listeners
     */
    init() {
        this.setupFormListeners();
        this.setupButtonListeners();
        this.setupThemeToggle();
        this.loadRecentSearches();
        this.applyTheme();
    },
    
    /**
     * Set up form event listeners
     */
    setupFormListeners() {
        const form = document.getElementById('searchForm');
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSearch();
        });
        
        // Validate limit input
        const limitInput = document.getElementById('limit');
        limitInput.addEventListener('input', () => {
            const value = parseInt(limitInput.value, 10);
            if (value > CONFIG.MAX_LIMIT) {
                limitInput.value = CONFIG.MAX_LIMIT;
            }
        });
        
        // Reset bbox button
        const resetBboxBtn = document.getElementById('resetBbox');
        resetBboxBtn.addEventListener('click', () => {
            MapManager.resetBounds();
            this.showStatus('Area reset to Belgium', 'info');
        });
        
        // Sort by change
        const sortBySelect = document.getElementById('sortBy');
        sortBySelect.addEventListener('change', () => {
            if (this.searchResults.length > 0) {
                this.applySorting();
            }
        });
    },
    
    /**
     * Set up button event listeners
     */
    setupButtonListeners() {
        // Fit bounds button
        const fitBoundsBtn = document.getElementById('fitBounds');
        fitBoundsBtn.addEventListener('click', () => {
            MapManager.fitBounds();
            this.showStatus('View adjusted to results', 'info');
        });
        
        // Toggle clusters button
        const toggleClustersBtn = document.getElementById('toggleClusters');
        toggleClustersBtn.addEventListener('click', () => {
            const enabled = MapManager.toggleClustering();
            const status = enabled ? 'enabled' : 'disabled';
            const icon = enabled ? '⊚' : '●';
            toggleClustersBtn.innerHTML = `<span>${icon}</span>`;
            this.showStatus(`Clustering ${status}`, 'info');
        });
    },
    
    /**
     * Set up theme toggle functionality
     */
    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        
        themeToggle.addEventListener('click', () => {
            const newTheme = StorageManager.toggleTheme();
            this.applyTheme(newTheme);
        });
    },
    
    /**
     * Apply theme to the page
     * @param {String} theme - 'light' or 'dark'
     */
    applyTheme(theme) {
        if (!theme) {
            theme = StorageManager.getTheme();
        }
        
        document.documentElement.setAttribute('data-theme', theme);
        
        const themeIcon = document.querySelector('.theme-icon');
        themeIcon.textContent = theme === 'dark' ? '☀' : '☾';
    },
    
    /**
     * Handle search form submission
     */
    async handleSearch() {
        try {
            // Get form data
            const formData = this.getFormData();
            
            // Validate parameters
            const validation = APIManager.validateParams(formData);
            if (!validation.valid) {
                this.showStatus(`⚠️ ${validation.errors.join(', ')}`, 'error');
                return;
            }
            
            // Show loading state
            this.setLoadingState(true);
            this.showStatus(CONFIG.MESSAGES.LOADING, 'sending');
            
            // Make API request
            const data = await APIManager.searchNotes(formData);
            
            // Store results
            this.searchResults = data.features || [];
            
            // Apply sorting
            this.applySorting();
            
            // Display on map
            MapManager.displayNotes(this.searchResults);
            
            // Update statistics
            const stats = APIManager.calculateStats(this.searchResults);
            this.updateStats(stats);
            
            // Show results status
            if (this.searchResults.length === 0) {
                this.showStatus(CONFIG.MESSAGES.NO_RESULTS, 'info');
            } else {
                this.showStatus(
                    `${this.searchResults.length} note(s) found`, 
                    'success'
                );
            }
            
            // Show export options
            this.showExportOptions(this.searchResults.length > 0);
            
            // Save search to recent
            // StorageManager.saveSearch(formData);  // Sauvegarde des recherches désactivée
            this.loadRecentSearches();
            
        } catch (error) {
            console.error('Search error:', error);
            this.showStatus(`⚠️ Erreur: ${error.message}`, 'error');
        } finally {
            this.setLoadingState(false);
        }
    },
    
    /**
     * Get form data as object
     * @returns {Object} Form data
     */
    getFormData() {
        const form = document.getElementById('searchForm');
        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            if (value) {
                data[key] = value;
            }
        }
        
        // Handle closed parameter from status switch
        const statusSwitch = document.getElementById('statusSwitch');
        data.closed = statusSwitch.checked ? CONFIG.CLOSED_DAYS.toString() : '0';
        
        return data;
    },
    
    /**
     * Apply sorting to current results
     */
    applySorting() {
        const sortBy = document.getElementById('sortBy').value;
        this.searchResults = APIManager.sortFeatures(this.searchResults, sortBy);
        MapManager.displayNotes(this.searchResults);
    },
    
    /**
     * Update statistics display
     * @param {Object} stats - Statistics object
     */
    updateStats(stats) {
        document.getElementById('totalNotes').textContent = stats.total || 0;
        document.getElementById('openNotes').textContent = stats.open || 0;
        document.getElementById('closedNotes').textContent = stats.closed || 0;
        document.getElementById('avgComments').textContent = stats.avgComments || 0;
    },
    
    /**
     * Show/hide export options
     * @param {Boolean} show - Whether to show export options
     */
    showExportOptions(show) {
        const exportSection = document.getElementById('exportSection');
        exportSection.style.display = show ? 'block' : 'none';
    },
    
    /**
     * Show status message
     * @param {String} message - Status message
     * @param {String} type - Message type (sending, success, error, info)
     */
    showStatus(message, type = 'info') {
        const statusBar = document.getElementById('statusBar');
        const statusContent = document.getElementById('statusContent');
        
        const icons = {
            sending: '⟳',
            success: '✓',
            error: '!',
            info: 'i'
        };
        
        statusContent.innerHTML = `
            <span class="status-icon status-${type}">${icons[type] || icons.info}</span>
            <span>${message}</span>
        `;
        
        statusBar.style.display = 'block';
        statusBar.classList.add('fade-in');
        
        // Auto-hide after delay (except for loading state)
        if (type !== 'sending') {
            setTimeout(() => {
                statusBar.style.display = 'none';
            }, CONFIG.UI.STATUS_DISPLAY_TIME);
        }
    },
    
    /**
     * Set loading state for the search button
     * @param {Boolean} loading - Whether loading
     */
    setLoadingState(loading) {
        const searchBtn = document.getElementById('searchBtn');
        
        if (loading) {
            searchBtn.classList.add('loading');
            searchBtn.disabled = true;
        } else {
            searchBtn.classList.remove('loading');
            searchBtn.disabled = false;
        }
    },
    
    /**
     * Load and display recent searches
     */
    loadRecentSearches() {
        const searches = StorageManager.getRecentSearches();
        const container = document.getElementById('recentSearchesContainer');
        const list = document.getElementById('recentSearchesList');
        
        if (searches.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        list.innerHTML = '';
        
        searches.forEach((search, index) => {
            const item = document.createElement('div');
            item.className = 'recent-search-item';
            item.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 4px;">${search.label}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                    ${StorageManager.formatTimestamp(search.timestamp)}
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.loadSearch(search.params);
            });
            
            list.appendChild(item);
        });
    },
    
    /**
     * Load a search into the form
     * @param {Object} params - Search parameters
     */
    loadSearch(params) {
        // Fill form fields
        if (params.q) {
            document.getElementById('q').value = params.q;
        }
        
        if (params.limit) {
            document.getElementById('limit').value = params.limit;
        }
        
        if (params.display_name) {
            document.getElementById('display_name').value = params.display_name;
        }
        
        if (params.bbox) {
            document.getElementById('bbox').value = params.bbox;
        }
        
        if (params.from) {
            document.getElementById('from').value = params.from;
        }
        
        if (params.to) {
            document.getElementById('to').value = params.to;
        }
        
        // Set status switch
        const statusSwitch = document.getElementById('statusSwitch');
        statusSwitch.checked = params.closed !== '0';
        
        // Show notification
        this.showStatus('Search loaded', 'info');
        
        // Optionally trigger search
        // this.handleSearch();
    },
    
    /**
     * Show error message
     * @param {String} message - Error message
     */
    showError(message) {
        this.showStatus(message, 'error');
    },
    
    /**
     * Show success message
     * @param {String} message - Success message
     */
    showSuccess(message) {
        this.showStatus(message, 'success');
    }
};
