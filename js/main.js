// ===================================
// Main Application Initialization
// ===================================

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing OSM Notes Search Belgium...');
    
    try {
        // Initialize map
        console.log('Initializing map...');
        MapManager.init();
        
        // Initialize UI
        console.log('Initializing UI...');
        UIManager.init();
        
        // Initialize export functionality
        console.log('Initializing export...');
        ExportManager.init();
        
        // Check localStorage availability
        if (!StorageManager.isAvailable()) {
            console.warn('localStorage is not available. Recent searches and theme preferences will not be saved.');
        }
        
        console.log('Application initialized successfully!');
        
        // Show welcome message
        showWelcomeMessage();
        
    } catch (error) {
        console.error('Error initializing application:', error);
        showInitError(error);
    }
});

/**
 * Show welcome message on first visit
 */
function showWelcomeMessage() {
    const hasVisited = localStorage.getItem('osm_notes_has_visited');
    
    if (!hasVisited) {
        UIManager.showStatus(
            'Welcome! Use the filters to search for OSM notes in Belgium',
            'info'
        );
        localStorage.setItem('osm_notes_has_visited', 'true');
    }
}

/**
 * Show initialization error
 * @param {Error} error - The error that occurred
 */
function showInitError(error) {
    const statusBar = document.getElementById('statusBar');
    const statusContent = document.getElementById('statusContent');
    
    statusContent.innerHTML = `
        <div style="color: var(--error); text-align: center;">
            <h3>Initialization error</h3>
            <p>The application could not start properly.</p>
            <p style="font-size: 0.9rem; opacity: 0.8;">${error.message}</p>
            <button onclick="location.reload()" class="btn-primary" style="margin-top: 10px;">
                Reload page
            </button>
        </div>
    `;
    
    statusBar.style.display = 'block';
}

/**
 * Handle window resize events
 */
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (MapManager.map) {
            MapManager.map.invalidateSize();
        }
    }, 250);
});

/**
 * Handle keyboard shortcuts
 */
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K: Focus search input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('q').focus();
    }
    
    // Ctrl/Cmd + Enter: Submit search
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.closest('#searchForm')) {
            e.preventDefault();
            UIManager.handleSearch();
        }
    }
    
    // Escape: Clear focus
    if (e.key === 'Escape') {
        document.activeElement.blur();
    }
});

/**
 * Handle page visibility changes
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Cancel any ongoing API requests when page is hidden
        APIManager.cancelRequest();
    }
});

/**
 * Handle before unload (warn if search is in progress)
 */
window.addEventListener('beforeunload', (e) => {
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn && searchBtn.classList.contains('loading')) {
        e.preventDefault();
        e.returnValue = 'A search is in progress. Do you really want to leave?';
        return e.returnValue;
    }
});

/**
 * Service Worker registration (for PWA support - optional)
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment to enable service worker
        // navigator.serviceWorker.register('/sw.js')
        //     .then(reg => console.log('Service Worker registered:', reg))
        //     .catch(err => console.log('Service Worker registration failed:', err));
    });
}

/**
 * Console branding
 */
console.log(
    '%c OSM Notes Search Belgium ',
    'background: #007BFF; color: white; font-size: 16px; padding: 10px; font-weight: bold;'
);
console.log(
    '%c Made with care by the OSM Belgium community ',
    'background: #28a745; color: white; font-size: 12px; padding: 5px;'
);
console.log(
    '%c GitHub: https://github.com/pasloin/Basic-Osm-Notes-Search-BE ',
    'color: #6c757d; font-size: 11px;'
);

/**
 * Expose API for debugging (development only)
 */
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.OSMNotesApp = {
        map: MapManager,
        ui: UIManager,
        api: APIManager,
        storage: StorageManager,
        export: ExportManager,
        config: CONFIG,
        version: '2.0.0'
    };
    console.log(
        '%c Debug API available: window.OSMNotesApp ',
        'background: #ffc107; color: black; font-size: 12px; padding: 5px;'
    );
}
