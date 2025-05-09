/**
 * Field Connections Handler - Advanced Version
 * 
 * This script manages connections between fields in forms,
 * allowing for dynamic updates based on related fields.
 * Supports math operations, lookups, and custom formulas.
 */

// Store field connections data
let fieldConnections = [];
let fieldSuggestions = {};
let formFields = {};
let suggestionsCache = {};

// Connection types
const CONNECTION_TYPES = {
    SHOW_RELATED: 'show_related',  // Show a related value from another field
    COPY: 'copy',                 // Copy the value of a source field
    ADD: 'add',                   // Add values (for numeric fields)
    SUBTRACT: 'subtract',         // Subtract values (for numeric fields)
    MULTIPLY: 'multiply',         // Multiply values (for numeric fields)
    DIVIDE: 'divide',             // Divide values (for numeric fields)
    CUSTOM_FORMULA: 'custom_formula' // Custom JS formula
};

// Initialize field connections
function initFieldConnections() {
    // Get field connections from server
    fetch('/api/field_connections')
        .then(response => response.json())
        .then(data => {
            fieldConnections = data.connections || [];
            setupConnectionListeners();
        })
        .catch(error => {
            console.error('Error fetching field connections:', error);
            // Try to load from localStorage as fallback for offline mode
            const savedConnections = localStorage.getItem('field_connections');
            if (savedConnections) {
                try {
                    fieldConnections = JSON.parse(savedConnections);
                    setupConnectionListeners();
                } catch (e) {
                    console.error('Error parsing saved connections:', e);
                }
            }
        });
    
    // Get form fields
    fetch('/api/form_fields')
        .then(response => response.json())
        .then(data => {
            formFields = data.fields || {};
            
            // Store fields that have suggestions enabled
            Object.keys(formFields).forEach(formId => {
                formFields[formId].forEach(field => {
                    if (field.suggestions_enabled) {
                        if (!fieldSuggestions[formId]) {
                            fieldSuggestions[formId] = [];
                        }
                        fieldSuggestions[formId].push(field.field_name);
                    }
                });
            });
            
            // Set up suggestions for fields
            setupSuggestionFields();
        })
        .catch(error => {
            console.error('Error fetching form fields:', error);
            // Try to load from localStorage as fallback for offline mode
            const savedFields = localStorage.getItem('form_fields');
            if (savedFields) {
                try {
                    formFields = JSON.parse(savedFields);
                    setupSuggestionFields();
                } catch (e) {
                    console.error('Error parsing saved fields:', e);
                }
            }
        });
}

// Setup field connection event listeners
function setupConnectionListeners() {
    // Save to localStorage for offline access
    localStorage.setItem('field_connections', JSON.stringify(fieldConnections));
    
    // Filter connections by the current form
    const formId = document.querySelector('form')?.dataset?.formId;
    if (!formId) return;
    
    const formConnections = fieldConnections.filter(conn => 
        conn.source_field && conn.source_field.form_id === formId);
    
    if (formConnections.length === 0) return;
    
    // Add event listeners to source fields
    formConnections.forEach(connection => {
        const sourceFieldName = connection.source_field?.field_name;
        const sourceField = document.querySelector(`[name="${sourceFieldName}"]`);
        
        if (sourceField) {
            // Remove any existing listeners
            sourceField.removeEventListener('change', handleFieldChange);
            sourceField.removeEventListener('input', handleFieldChange);
            
            // Add new listeners
            sourceField.addEventListener('change', handleFieldChange);
            sourceField.addEventListener('input', handleFieldChange);
            
            // Trigger initial update
            setTimeout(() => {
                if (sourceField.value) {
                    handleFieldConnection(connection, sourceField.value);
                }
            }, 500);
        }
    });
}

// Handle field change event
function handleFieldChange(event) {
    const sourceFieldName = event.target.name;
    const sourceValue = event.target.value;
    
    // Find connections that use this field as source
    const connections = fieldConnections.filter(conn => 
        conn.source_field?.field_name === sourceFieldName);
    
    // Process each connection
    connections.forEach(connection => {
        handleFieldConnection(connection, sourceValue);
    });
}

// Process a single field connection
function handleFieldConnection(connection, sourceValue) {
    const targetFieldName = connection.target_field?.field_name;
    const targetField = document.querySelector(`[name="${targetFieldName}"]`);
    
    if (!targetField) return;
    
    switch (connection.connection_type) {
        case CONNECTION_TYPES.SHOW_RELATED:
            handleShowRelated(connection, sourceValue, targetField);
            break;
        case CONNECTION_TYPES.COPY:
            targetField.value = sourceValue;
            triggerChange(targetField);
            break;
        case CONNECTION_TYPES.ADD:
        case CONNECTION_TYPES.SUBTRACT:
        case CONNECTION_TYPES.MULTIPLY:
        case CONNECTION_TYPES.DIVIDE:
            handleMathOperation(connection, sourceValue, targetField);
            break;
        case CONNECTION_TYPES.CUSTOM_FORMULA:
            handleCustomFormula(connection, sourceValue, targetField);
            break;
    }
}

// Handle SHOW_RELATED connection type
function handleShowRelated(connection, sourceValue, targetField) {
    // Get parameters
    const params = connection.parameters ? JSON.parse(connection.parameters) : {};
    const apiEndpoint = params.api_endpoint || '/api/related_field_value';
    
    // Make API call to get related value
    fetch(`${apiEndpoint}?source_field=${connection.source_field.id}&source_value=${encodeURIComponent(sourceValue)}&target_field=${connection.target_field.id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.value !== undefined) {
                targetField.value = data.value;
                triggerChange(targetField);
            }
        })
        .catch(error => {
            console.error('Error fetching related value:', error);
            
            // Try offline cache if available
            const cacheKey = `related_${connection.source_field.id}_${sourceValue}_${connection.target_field.id}`;
            const cachedValue = localStorage.getItem(cacheKey);
            if (cachedValue) {
                targetField.value = cachedValue;
                triggerChange(targetField);
            }
        });
}

// Handle math operations
function handleMathOperation(connection, sourceValue, targetField) {
    // Get the other value to use in the operation
    let otherValue;
    
    const params = connection.parameters ? JSON.parse(connection.parameters) : {};
    
    if (params.other_field) {
        // Get value from another field
        const otherField = document.querySelector(`[name="${params.other_field}"]`);
        if (otherField) {
            otherValue = parseFloat(otherField.value) || 0;
        } else {
            otherValue = 0;
        }
    } else if (params.constant !== undefined) {
        // Use a constant value
        otherValue = parseFloat(params.constant) || 0;
    } else {
        otherValue = 0;
    }
    
    // Parse source value
    const sourceNumeric = parseFloat(sourceValue) || 0;
    
    // Calculate result based on operation
    let result = 0;
    switch (connection.connection_type) {
        case CONNECTION_TYPES.ADD:
            result = sourceNumeric + otherValue;
            break;
        case CONNECTION_TYPES.SUBTRACT:
            if (params.reverse) {
                result = otherValue - sourceNumeric;
            } else {
                result = sourceNumeric - otherValue;
            }
            break;
        case CONNECTION_TYPES.MULTIPLY:
            result = sourceNumeric * otherValue;
            break;
        case CONNECTION_TYPES.DIVIDE:
            if (params.reverse) {
                result = otherValue === 0 ? 0 : otherValue / sourceNumeric;
            } else {
                result = sourceNumeric === 0 ? 0 : sourceNumeric / otherValue;
            }
            break;
    }
    
    // Apply formatting if specified
    if (params.decimals !== undefined) {
        result = result.toFixed(params.decimals);
    }
    
    // Update target field
    targetField.value = result;
    triggerChange(targetField);
}

// Handle custom formula
function handleCustomFormula(connection, sourceValue, targetField) {
    try {
        const params = connection.parameters ? JSON.parse(connection.parameters) : {};
        const formula = params.formula || '';
        
        if (!formula) return;
        
        // Create a context with all form values
        const form = targetField.form;
        const formData = new FormData(form);
        const formValues = {};
        
        for (const [key, value] of formData.entries()) {
            formValues[key] = value;
        }
        
        // Add source and target as special variables
        formValues.source = sourceValue;
        formValues.result = targetField.value;
        
        // Create a safe evaluation context
        const evalContext = {
            values: formValues,
            parseInt: parseInt,
            parseFloat: parseFloat,
            Math: Math,
            Date: Date,
            result: 0
        };
        
        // Create and execute the formula function
        const formulaFunc = new Function(
            'values', 'parseInt', 'parseFloat', 'Math', 'Date', 
            `try { return ${formula}; } catch(e) { console.error('Formula error:', e); return 0; }`
        );
        
        const result = formulaFunc(
            evalContext.values, 
            evalContext.parseInt, 
            evalContext.parseFloat, 
            evalContext.Math, 
            evalContext.Date
        );
        
        // Update target field
        targetField.value = result;
        triggerChange(targetField);
    } catch (error) {
        console.error('Error in custom formula:', error);
    }
}

// Trigger change event on field
function triggerChange(field) {
    const event = new Event('change', { bubbles: true });
    field.dispatchEvent(event);
    
    // Also trigger input event for React-like frameworks
    const inputEvent = new Event('input', { bubbles: true });
    field.dispatchEvent(inputEvent);
}

// Setup suggestion fields
function setupSuggestionFields() {
    // Save to localStorage for offline access
    localStorage.setItem('form_fields', JSON.stringify(formFields));
    
    // Get current form ID
    const form = document.querySelector('form');
    if (!form) return;
    
    const formId = form.dataset.formId;
    if (!formId || !fieldSuggestions[formId]) return;
    
    // Setup each suggestion-enabled field
    fieldSuggestions[formId].forEach(fieldName => {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (!field) return;
        
        // Create datalist if it doesn't exist
        let datalist = document.getElementById(`suggestions-${fieldName}`);
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = `suggestions-${fieldName}`;
            document.body.appendChild(datalist);
            field.setAttribute('list', datalist.id);
        }
        
        // Add input event to load suggestions
        field.addEventListener('focus', () => loadSuggestions(field, formId, fieldName, datalist));
        field.addEventListener('input', () => loadSuggestions(field, formId, fieldName, datalist));
    });
}

// Load suggestions for a field
function loadSuggestions(field, formId, fieldName, datalist) {
    // Only load suggestions if field has at least 2 characters
    const value = field.value.trim();
    if (value.length < 2) return;
    
    // Check cache first
    const cacheKey = `${formId}_${fieldName}_${value}`;
    if (suggestionsCache[cacheKey]) {
        updateDatalist(datalist, suggestionsCache[cacheKey]);
        return;
    }
    
    // Fetch from API
    fetch(`/api/suggestions?field=${fieldName}&query=${encodeURIComponent(value)}&form_id=${formId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && Array.isArray(data.suggestions)) {
                // Cache the results
                suggestionsCache[cacheKey] = data.suggestions;
                
                // Store in localStorage for offline use
                try {
                    const offlineSuggestions = JSON.parse(localStorage.getItem('offline_suggestions') || '{}');
                    offlineSuggestions[cacheKey] = data.suggestions;
                    localStorage.setItem('offline_suggestions', JSON.stringify(offlineSuggestions));
                } catch (e) {
                    console.error('Error storing suggestions in localStorage:', e);
                }
                
                // Update datalist
                updateDatalist(datalist, data.suggestions);
            }
        })
        .catch(error => {
            console.error('Error fetching suggestions:', error);
            
            // Try offline suggestions
            try {
                const offlineSuggestions = JSON.parse(localStorage.getItem('offline_suggestions') || '{}');
                if (offlineSuggestions[cacheKey]) {
                    updateDatalist(datalist, offlineSuggestions[cacheKey]);
                }
            } catch (e) {
                console.error('Error loading offline suggestions:', e);
            }
        });
}

// Update datalist with suggestions
function updateDatalist(datalist, suggestions) {
    // Clear existing options
    datalist.innerHTML = '';
    
    // Add new options
    suggestions.forEach(suggestion => {
        const option = document.createElement('option');
        option.value = suggestion;
        datalist.appendChild(option);
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initFieldConnections);

// Re-initialize when page navigation happens in SPA
window.addEventListener('popstate', initFieldConnections);

// Export functions for use in other scripts
window.FieldConnections = {
    refresh: initFieldConnections,
    setupConnectionListeners,
    setupSuggestionFields
};