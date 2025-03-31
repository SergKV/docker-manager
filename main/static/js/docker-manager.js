class DockerManagerUI {
    constructor() {
        if (DockerManagerUI.instance) {
            return DockerManagerUI.instance;
        }
        DockerManagerUI.instance = this;

        // Initialize all DOM elements
        this.elements = {
            statusContainer: document.getElementById('status-container'),
            statusMessage: document.getElementById('status-message'),
            versionInfo: document.getElementById('version-info'),
            osInfo: document.getElementById('os-info'),
            lastUpdated: document.getElementById('last-updated'),
            statusSpinner: document.getElementById('status-spinner'),
            alertContainer: document.getElementById('alert-container'),
            installBtn: document.getElementById('install-btn'),
            updateBtn: document.getElementById('update-btn'),
            uninstallBtn: document.getElementById('uninstall-btn'),
            refreshBtn: document.getElementById('refresh-btn'),
            autoRefreshToggle: document.getElementById('auto-refresh-toggle'),
            heartbeatIndicator: document.getElementById('heartbeat-indicator'),
            connectionStatus: document.getElementById('connection-status'),
            alertTemplate: document.getElementById('alert-template')
        };

        this.config = {
            autoRefreshInterval: 5000,
            endpoints: {
                check: '/api/check',
                install: '/api/install',
                update: '/api/update',
                uninstall: '/api/uninstall'
            }
        };

        this.state = {
            autoRefreshTimer: null,
            isOnline: navigator.onLine
        };
        
        // Track bound state
        this._eventsBound = false;
        this._boundHandlers = new Map();

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateConnectionStatus();
        this.refreshStatus();
    }

    updateConnectionStatus() {
        this.state.isOnline = navigator.onLine;
        this.elements.heartbeatIndicator.className = this.state.isOnline ? 'bg-success' : 'bg-danger';
        this.elements.connectionStatus.textContent = this.state.isOnline ? 'Connected' : 'Disconnected';
        
        if (!this.state.isOnline) {
            this.showAlert('Lost connection to server', 'warning');
        }
    }

    bindEvents() {
        if (this._eventsBound) {
            console.warn('Events already bound!');
            return;
        }

        // Clean up any existing listeners
        this.unbindEvents();

        // Create and store bound handlers
        const handlers = {
            install: () => this.handleInstall(),
            update: () => this.handleUpdate(),
            uninstall: () => this.handleUninstall(),
            refresh: () => this.refreshStatus(),
            autoRefresh: () => this.toggleAutoRefresh()
        };

        // Store handlers for later cleanup
        Object.entries(handlers).forEach(([name, handler]) => {
            this._boundHandlers.set(name, handler);
        });

        // Bind events
        this.elements.installBtn.addEventListener('click', handlers.install);
        this.elements.updateBtn.addEventListener('click', handlers.update);
        this.elements.uninstallBtn.addEventListener('click', handlers.uninstall);
        this.elements.refreshBtn.addEventListener('click', handlers.refresh);
        this.elements.autoRefreshToggle.addEventListener('change', handlers.autoRefresh);

        // Network events
        window.addEventListener('online', () => this.handleConnectionChange(true));
        window.addEventListener('offline', () => this.handleConnectionChange(false));

        this._eventsBound = true;
    }

    unbindEvents() {
        if (!this._eventsBound) return;

        // Remove button event listeners
        this._boundHandlers.forEach((handler, name) => {
            switch (name) {
                case 'install':
                    this.elements.installBtn.removeEventListener('click', handler);
                    break;
                case 'update':
                    this.elements.updateBtn.removeEventListener('click', handler);
                    break;
                case 'uninstall':
                    this.elements.uninstallBtn.removeEventListener('click', handler);
                    break;
                case 'refresh':
                    this.elements.refreshBtn.removeEventListener('click', handler);
                    break;
                case 'autoRefresh':
                    this.elements.autoRefreshToggle.removeEventListener('change', handler);
                    break;
            }
        });

        // Remove network event listeners
        window.removeEventListener('online', () => this.handleConnectionChange(true));
        window.removeEventListener('offline', () => this.handleConnectionChange(false));

        this._boundHandlers.clear();
        this._eventsBound = false;
    }

    handleConnectionChange(isOnline) {
        this.state.isOnline = isOnline;
        this.updateConnectionStatus();
        
        if (isOnline) {
            this.refreshStatus();
            if (this.elements.autoRefreshToggle.checked) {
                this.startAutoRefresh();
            }
        } else {
            this.stopAutoRefresh();
        }
    }

    async refreshStatus() {
        if (!this.state.isOnline) {
            return;
        }

        try {
            this.showLoading(true);
            const response = await fetch(this.config.endpoints.check);
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            this.updateUI(data);
            this.updateLastUpdated();
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                this.handleConnectionChange(false);
            } else {
                this.showAlert('Error fetching Docker status: ' + error.message, 'danger');
            }
        } finally {
            this.showLoading(false);
        }
    }

    updateUI(status) {
        if (status.installed) {
            this.elements.statusMessage.innerHTML = '<span class="text-success"><i class="fas fa-check-circle"></i> Docker is installed</span>';
            this.elements.versionInfo.textContent = status.version || 'Version information not available';
            this.elements.installBtn.disabled = true;
            this.elements.updateBtn.disabled = false;
            this.elements.uninstallBtn.disabled = false;
        } else {
            this.elements.statusMessage.innerHTML = '<span class="text-danger"><i class="fas fa-times-circle"></i> Docker is not installed</span>';
            this.elements.versionInfo.textContent = '';
            this.elements.installBtn.disabled = false;
            this.elements.updateBtn.disabled = true;
            this.elements.uninstallBtn.disabled = true;
        }
        
        if (status.os) {
            this.elements.osInfo.textContent = `OS: ${status.os.charAt(0).toUpperCase() + status.os.slice(1)}`;
        }
    }

    updateLastUpdated() {
        const now = new Date();
        this.elements.lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString()}`;
    }

    async handleInstall() {
        if (!confirm('Are you sure you want to install Docker?')) return;
        await this.handleAction('install', 'Installation');
    }

    async handleUpdate() {
        if (!confirm('Are you sure you want to update Docker?')) return;
        await this.handleAction('update', 'Update');
    }

    async handleUninstall() {
        if (!confirm('WARNING: This will uninstall Docker. Are you sure?')) return;
        await this.handleAction('uninstall', 'Uninstallation');
    }

    async handleAction(action, actionName) {
        try {
            this.showLoading(true);
            const response = await fetch(this.config.endpoints[action], {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const result = await response.json();
            this.showAlert(`${actionName} ${result.success ? 'succeeded' : 'failed'}: ${result.message}`, 
                          result.success ? 'success' : 'danger');
            this.refreshStatus();
        } catch (error) {
            this.showAlert(`Error during ${actionName.toLowerCase()}: ${error.message}`, 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        if (show) {
            this.elements.statusSpinner.classList.remove('d-none');
            [this.elements.installBtn, this.elements.updateBtn, this.elements.uninstallBtn, this.elements.refreshBtn].forEach(btn => {
                btn.disabled = true;
            });
        } else {
            this.elements.statusSpinner.classList.add('d-none');
            this.elements.refreshBtn.disabled = false;
        }
    }

    showAlert(message, type) {
        const alert = this.elements.alertTemplate.content.cloneNode(true);
        const alertDiv = alert.querySelector('.alert');
        alertDiv.classList.add(`alert-${type}`);
        alert.querySelector('.alert-message').textContent = message;
        
        // Remove any existing alerts
        while (this.elements.alertContainer.firstChild) {
            this.elements.alertContainer.removeChild(this.elements.alertContainer.firstChild);
        }
        
        this.elements.alertContainer.appendChild(alert);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alertDiv);
            bsAlert.close();
        }, 5000);
    }

    startAutoRefresh() {
        if (this.state.autoRefreshTimer) {
            clearInterval(this.state.autoRefreshTimer);
        }
        this.state.autoRefreshTimer = setInterval(() => {
            this.refreshStatus();
        }, this.config.autoRefreshInterval);
    }

    stopAutoRefresh() {
        if (this.state.autoRefreshTimer) {
            clearInterval(this.state.autoRefreshTimer);
            this.state.autoRefreshTimer = null;
        }
    }

    toggleAutoRefresh() {
        if (this.elements.autoRefreshToggle.checked) {
            this.startAutoRefresh();
        } else {
            this.stopAutoRefresh();
        }
    }
}

// Singleton pattern implementation
let dockerUIInstance = null;

function initializeDockerUI() {
    if (!dockerUIInstance) {
        dockerUIInstance = new DockerManagerUI();
    }
    return dockerUIInstance;
}

// Initialize with proper cleanup
document.addEventListener('DOMContentLoaded', () => {
    // Clean up any existing instance
    if (window.dockerUI) {
        window.dockerUI.unbindEvents();
        window.dockerUI = null;
    }
    
    initializeDockerUI();
});

// Optional: Handle page transitions (for SPA)
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        if (window.dockerUI) {
            window.dockerUI.unbindEvents();
            window.dockerUI = null;
        }
    });
}