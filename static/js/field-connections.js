/**
 * Field Connections Manager
 * Handles dynamic connections between form fields based on configuration from the server.
 * 
 * Features:
 * - Automatic field updates based on defined connections
 * - Supports different connection types (show_related, copy, add, subtract, multiply, divide, custom_formula)
 * - Cache for offline support
 * - Suggestions from historical data
 */

class FieldConnectionsManager {
    constructor() {
        this.connections = [];
        this.cachedRelations = {};
        this.suggestionFields = [];
        this.suggestionCache = {};
        this.formId = '';
        this.initialized = false;
        this.offlineMode = !navigator.onLine;
        
        // Bind methods
        this.initialize = this.initialize.bind(this);
        this.handleFieldChange = this.handleFieldChange.bind(this);
        this.processConnections = this.processConnections.bind(this);
        this.getRelatedValue = this.getRelatedValue.bind(this);
        this.setupSuggestions = this.setupSuggestions.bind(this);
        this.fetchSuggestions = this.fetchSuggestions.bind(this);
        this.handleOnlineStatusChange = this.handleOnlineStatusChange.bind(this);
        
        // Listen for online/offline events
        window.addEventListener('online', this.handleOnlineStatusChange);
        window.addEventListener('offline', this.handleOnlineStatusChange);
    }
    
    /**
     * Initialize the manager with connections for a specific form
     * @param {string} formId - The ID of the form to manage connections for
     */
    async initialize(formId) {
        if (this.initialized && this.formId === formId) {
            return;
        }
        
        this.formId = formId;
        
        try {
            // Fetch connections from the server or use cached version if offline
            let connections;
            
            if (navigator.onLine) {
                const response = await fetch(`/api/field_connections?form_id=${formId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch field connections');
                }
                
                connections = await response.json();
                
                // Cache connections for offline use
                localStorage.setItem(`connections_${formId}`, JSON.stringify(connections));
            } else {
                // Use cached connections if offline
                const cachedData = localStorage.getItem(`connections_${formId}`);
                if (cachedData) {
                    connections = JSON.parse(cachedData);
                } else {
                    console.warn('No cached connections available for offline use');
                    connections = { connections: [], suggestions: [] };
                }
            }
            
            this.connections = connections.connections || [];
            this.suggestionFields = connections.suggestions || [];
            
            // Set up connection event listeners
            this.setupConnectionListeners();
            
            // Set up auto-suggestions for fields
            this.setupSuggestions();
            
            this.initialized = true;
            console.log(`Field connections initialized for form: ${formId}`);
            
        } catch (error) {
            console.error('Error initializing field connections:', error);
        }
    }
    
    /**
     * Set up event listeners for all source fields that have connections
     */
    setupConnectionListeners() {
        // Clear any existing listeners first
        document.querySelectorAll('[data-field-listener]').forEach(element => {
            const fieldName = element.getAttribute('data-field-listener');
            element.removeAttribute('data-field-listener');
            
            // Clone the node to remove all event listeners
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
        });
        
        // Get all unique source fields
        const sourceFields = [...new Set(this.connections.map(conn => conn.source_field_name))];
        
        // Add event listeners to all source fields
        sourceFields.forEach(fieldName => {
            // Find the form field by name
            const field = document.querySelector(`#${this.formId} [name="${fieldName}"]`);
            if (!field) {
                console.warn(`Source field not found: ${fieldName}`);
                return;
            }
            
            // Mark the field as having a listener
            field.setAttribute('data-field-listener', fieldName);
            
            // Add event listener
            field.addEventListener('change', () => this.handleFieldChange(fieldName, field.value));
            field.addEventListener('input', () => this.handleFieldChange(fieldName, field.value));
            
            // Also trigger the handler for the initial value
            this.handleFieldChange(fieldName, field.value);
        });
    }
    
    /**
     * Set up auto-suggestions for designated fields
     */
    setupSuggestions() {
        this.suggestionFields.forEach(fieldName => {
            const field = document.querySelector(`#${this.formId} [name="${fieldName}"]`);
            if (!field) {
                console.warn(`Suggestion field not found: ${fieldName}`);
                return;
            }
            
            // Create suggestion container
            let suggestionContainer = document.getElementById(`suggestions_${fieldName}`);
            if (!suggestionContainer) {
                suggestionContainer = document.createElement('div');
                suggestionContainer.id = `suggestions_${fieldName}`;
                suggestionContainer.className = 'suggestions-container';
                suggestionContainer.style.display = 'none';
                suggestionContainer.style.position = 'absolute';
                suggestionContainer.style.width = '100%';
                suggestionContainer.style.maxHeight = '200px';
                suggestionContainer.style.overflowY = 'auto';
                suggestionContainer.style.backgroundColor = '#fff';
                suggestionContainer.style.border = '1px solid #ddd';
                suggestionContainer.style.borderTop = 'none';
                suggestionContainer.style.borderRadius = '0 0 4px 4px';
                suggestionContainer.style.zIndex = '1000';
                suggestionContainer.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                field.parentNode.style.position = 'relative';
                field.parentNode.appendChild(suggestionContainer);
            }
            
            // Add event listeners
            field.addEventListener('input', this.debounce(() => {
                this.fetchSuggestions(fieldName, field.value);
            }, 300));
            
            // Hide suggestions when clicking outside
            document.addEventListener('click', (event) => {
                if (event.target !== field && event.target !== suggestionContainer) {
                    suggestionContainer.style.display = 'none';
                }
            });
            
            // Hide suggestions when pressing Escape
            field.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    suggestionContainer.style.display = 'none';
                }
            });
        });
    }
    
    /**
     * Fetch suggestions for a field based on partial input
     * @param {string} fieldName - The name of the field
     * @param {string} value - The current value of the field
     */
    async fetchSuggestions(fieldName, value) {
        if (!value || value.length < 2) {
            const container = document.getElementById(`suggestions_${fieldName}`);
            if (container) {
                container.style.display = 'none';
            }
            return;
        }
        
        try {
            let suggestions;
            const cacheKey = `${fieldName}_${value}`;
            
            if (this.suggestionCache[cacheKey]) {
                suggestions = this.suggestionCache[cacheKey];
            } else if (navigator.onLine) {
                const response = await fetch(`/api/suggestions?field=${fieldName}&q=${encodeURIComponent(value)}&form_id=${this.formId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch suggestions');
                }
                
                suggestions = await response.json();
                
                // Cache suggestions
                this.suggestionCache[cacheKey] = suggestions;
                
                // Also store in localStorage for offline use
                try {
                    const offlineSuggestions = JSON.parse(localStorage.getItem('field_suggestions') || '{}');
                    offlineSuggestions[cacheKey] = suggestions;
                    localStorage.setItem('field_suggestions', JSON.stringify(offlineSuggestions));
                } catch (e) {
                    console.warn('Failed to cache suggestions in localStorage:', e);
                }
            } else {
                // Try to get from offline cache
                try {
                    const offlineSuggestions = JSON.parse(localStorage.getItem('field_suggestions') || '{}');
                    suggestions = offlineSuggestions[cacheKey] || [];
                    
                    // If no exact match, try fuzzy match
                    if (suggestions.length === 0) {
                        for (const key in offlineSuggestions) {
                            if (key.startsWith(`${fieldName}_`) && key.includes(value)) {
                                suggestions = offlineSuggestions[key];
                                break;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Failed to get suggestions from localStorage:', e);
                    suggestions = [];
                }
            }
            
            // Display suggestions
            const container = document.getElementById(`suggestions_${fieldName}`);
            if (container) {
                if (suggestions.length === 0) {
                    container.style.display = 'none';
                    return;
                }
                
                container.innerHTML = '';
                suggestions.forEach(suggestion => {
                    const item = document.createElement('div');
                    item.className = 'suggestion-item';
                    item.style.padding = '8px 12px';
                    item.style.cursor = 'pointer';
                    item.style.borderBottom = '1px solid #eee';
                    item.textContent = suggestion;
                    
                    // Highlight on hover
                    item.addEventListener('mouseover', () => {
                        item.style.backgroundColor = '#f8f9fa';
                    });
                    
                    item.addEventListener('mouseout', () => {
                        item.style.backgroundColor = '';
                    });
                    
                    // Select suggestion on click
                    item.addEventListener('click', () => {
                        const field = document.querySelector(`#${this.formId} [name="${fieldName}"]`);
                        if (field) {
                            field.value = suggestion;
                            container.style.display = 'none';
                            
                            // Trigger change event to update connected fields
                            field.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                    
                    container.appendChild(item);
                });
                
                container.style.display = 'block';
            }
            
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        }
    }
    
    /**
     * Handle field value changes
     * @param {string} fieldName - The name of the field that changed
     * @param {string} value - The new value of the field
     */
    handleFieldChange(fieldName, value) {
        // Find all connections where this field is the source
        const relevantConnections = this.connections.filter(conn => conn.source_field_name === fieldName);
        
        if (relevantConnections.length === 0) {
            return;
        }
        
        // Process each connection
        this.processConnections(relevantConnections, fieldName, value);
    }
    
    /**
     * Process connections for a source field
     * @param {Array} connections - The connections to process
     * @param {string} sourceFieldName - The name of the source field
     * @param {string} sourceValue - The value of the source field
     */
    async processConnections(connections, sourceFieldName, sourceValue) {
        for (const connection of connections) {
            const targetFieldName = connection.target_field_name;
            const targetField = document.querySelector(`#${this.formId} [name="${targetFieldName}"]`);
            
            if (!targetField) {
                console.warn(`Target field not found: ${targetFieldName}`);
                continue;
            }
            
            try {
                switch (connection.connection_type) {
                    case 'show_related':
                        const relatedValue = await this.getRelatedValue(sourceFieldName, sourceValue, connection);
                        targetField.value = relatedValue;
                        break;
                        
                    case 'copy':
                        targetField.value = sourceValue;
                        break;
                        
                    case 'add':
                        this.performMathOperation(sourceValue, targetField, 'add', connection.parameters);
                        break;
                        
                    case 'subtract':
                        this.performMathOperation(sourceValue, targetField, 'subtract', connection.parameters);
                        break;
                        
                    case 'multiply':
                        this.performMathOperation(sourceValue, targetField, 'multiply', connection.parameters);
                        break;
                        
                    case 'divide':
                        this.performMathOperation(sourceValue, targetField, 'divide', connection.parameters);
                        break;
                        
                    case 'custom_formula':
                        this.evaluateCustomFormula(sourceValue, targetField, connection.parameters);
                        break;
                        
                    default:
                        console.warn(`Unknown connection type: ${connection.connection_type}`);
                }
                
                // Trigger change event on the target field
                targetField.dispatchEvent(new Event('change', { bubbles: true }));
                
            } catch (error) {
                console.error(`Error processing connection from ${sourceFieldName} to ${targetFieldName}:`, error);
            }
        }
    }
    
    /**
     * Get related value from the server or cache
     * @param {string} sourceFieldName - The name of the source field
     * @param {string} sourceValue - The value of the source field
     * @param {Object} connection - The connection configuration
     * @returns {Promise<string>} The related value
     */
    async getRelatedValue(sourceFieldName, sourceValue, connection) {
        if (!sourceValue) {
            return '';
        }
        
        const cacheKey = `${sourceFieldName}_${sourceValue}`;
        
        // Check cache first
        if (this.cachedRelations[cacheKey] !== undefined) {
            return this.cachedRelations[cacheKey];
        }
        
        // If offline, check localStorage
        if (!navigator.onLine) {
            try {
                const offlineCache = JSON.parse(localStorage.getItem('field_relations') || '{}');
                if (offlineCache[cacheKey] !== undefined) {
                    return offlineCache[cacheKey];
                }
            } catch (e) {
                console.warn('Failed to read field relations from localStorage:', e);
            }
            
            // If no offline data available, return empty string
            return '';
        }
        
        // Fetch from server
        try {
            const response = await fetch(`/api/related_field_value?source_field=${sourceFieldName}&source_value=${encodeURIComponent(sourceValue)}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch related value');
            }
            
            const data = await response.json();
            const relatedValue = data.value || '';
            
            // Cache the value
            this.cachedRelations[cacheKey] = relatedValue;
            
            // Also store in localStorage for offline use
            try {
                const offlineCache = JSON.parse(localStorage.getItem('field_relations') || '{}');
                offlineCache[cacheKey] = relatedValue;
                localStorage.setItem('field_relations', JSON.stringify(offlineCache));
            } catch (e) {
                console.warn('Failed to cache field relation in localStorage:', e);
            }
            
            return relatedValue;
            
        } catch (error) {
            console.error('Error fetching related value:', error);
            return '';
        }
    }
    
    /**
     * Perform a mathematical operation on the field values
     * @param {string} sourceValue - The value of the source field
     * @param {HTMLElement} targetField - The target field element
     * @param {string} operation - The operation to perform (add, subtract, multiply, divide)
     * @param {Object} parameters - Additional parameters for the operation
     */
    performMathOperation(sourceValue, targetField, operation, parameters) {
        // Parse values
        const numericSource = parseFloat(sourceValue) || 0;
        const parameter = parameters && parameters.value ? parseFloat(parameters.value) : 0;
        
        let result;
        
        switch (operation) {
            case 'add':
                result = numericSource + parameter;
                break;
                
            case 'subtract':
                result = numericSource - parameter;
                break;
                
            case 'multiply':
                result = numericSource * parameter;
                break;
                
            case 'divide':
                result = parameter !== 0 ? numericSource / parameter : 0;
                break;
                
            default:
                result = numericSource;
        }
        
        // Format result
        targetField.value = result.toFixed(2);
    }
    
    /**
     * Evaluate a custom formula
     * @param {string} sourceValue - The value of the source field
     * @param {HTMLElement} targetField - The target field element
     * @param {Object} parameters - Parameters containing the formula
     */
    evaluateCustomFormula(sourceValue, targetField, parameters) {
        if (!parameters || !parameters.formula) {
            return;
        }
        
        try {
            const numericSource = parseFloat(sourceValue) || 0;
            const formula = parameters.formula.replace(/\{source\}/g, numericSource);
            
            // Safely evaluate the formula
            // eslint-disable-next-line no-new-func
            const result = new Function(`return ${formula}`)();
            
            // Format result
            targetField.value = result.toFixed(2);
            
        } catch (error) {
            console.error('Error evaluating formula:', error);
            targetField.value = '';
        }
    }
    
    /**
     * Handle online/offline status changes
     */
    handleOnlineStatusChange() {
        const wasOffline = this.offlineMode;
        this.offlineMode = !navigator.onLine;
        
        // If coming back online after being offline
        if (wasOffline && !this.offlineMode) {
            console.log('Back online. Refreshing field connections...');
            
            // Re-initialize to fetch fresh data
            this.initialized = false;
            this.initialize(this.formId);
        }
    }
    
    /**
     * Debounce function to limit how often a function can be called
     * @param {Function} func - The function to debounce
     * @param {number} wait - The time to wait in milliseconds
     * @returns {Function} The debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Create singleton instance
const fieldConnectionsManager = new FieldConnectionsManager();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Look for forms with data-form-connections attribute
    document.querySelectorAll('[data-form-connections]').forEach(form => {
        const formId = form.id;
        if (formId) {
            fieldConnectionsManager.initialize(formId);
        } else {
            console.warn('Form with data-form-connections attribute must have an ID');
        }
    });
});