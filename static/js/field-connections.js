/**
 * Field Connections Functionality
 * Allows fields to be connected with logical or mathematical relationships
 * 
 * Usage:
 * <input type="text" 
 *        data-source-field="true"
 *        data-field-name="hours_worked"
 *        data-form-id="timesheet"
 *        class="form-control">
 * 
 * <input type="text" 
 *        data-target-field="true"
 *        data-field-name="total_pay"
 *        data-form-id="timesheet"
 *        class="form-control">
 */

// Store field connections from the server
let fieldConnections = [];

// Initialize field connections
function initFieldConnections() {
    // First, find all source fields
    const sourceFields = document.querySelectorAll('[data-source-field="true"]');
    if (sourceFields.length === 0) return;
    
    // Fetch field connections from server
    fetch('/api/field-connections')
        .then(response => response.json())
        .then(data => {
            fieldConnections = data;
            
            // Add event listeners to source fields
            sourceFields.forEach(function(field) {
                field.addEventListener('input', handleSourceFieldChange);
                field.addEventListener('change', handleSourceFieldChange);
                
                // Trigger initial calculation on page load
                setTimeout(() => {
                    if (field.value) {
                        handleSourceFieldChange.call(field);
                    }
                }, 500);
            });
        })
        .catch(error => {
            console.error('Error fetching field connections:', error);
        });
}

// Handle source field changes
function handleSourceFieldChange() {
    const sourceFieldName = this.getAttribute('data-field-name');
    const sourceFormId = this.getAttribute('data-form-id');
    const sourceValue = this.value;
    
    if (!sourceFieldName || !sourceFormId || !sourceValue) return;
    
    // Find connections for this source field
    const connections = fieldConnections.filter(connection => 
        connection.source_name === sourceFieldName && 
        connection.source_form === sourceFormId
    );
    
    if (connections.length === 0) return;
    
    // Process each connection
    connections.forEach(function(connection) {
        // Find target field
        const targetField = document.querySelector(
            `[data-target-field="true"][data-field-name="${connection.target_name}"][data-form-id="${connection.target_form}"]`
        );
        
        if (!targetField) return;
        
        // Apply connection based on type
        applyFieldConnection(connection, sourceValue, targetField);
    });
}

// Apply a field connection
function applyFieldConnection(connection, sourceValue, targetField) {
    // Parse source value as number if possible
    let numericSourceValue = parseFloat(sourceValue);
    const isNumeric = !isNaN(numericSourceValue);
    
    // Default parameters
    let parameters = {};
    try {
        parameters = JSON.parse(connection.parameters || '{}');
    } catch (e) {
        console.error('Invalid connection parameters:', e);
    }
    
    let result;
    
    switch (connection.connection_type) {
        case 'show_related':
            // Show related values from the server
            fetchRelatedValue(connection, sourceValue, targetField);
            break;
            
        case 'add':
            if (isNumeric) {
                const addend = parseFloat(parameters.value || 0);
                result = numericSourceValue + addend;
                targetField.value = result.toFixed(2);
            }
            break;
            
        case 'subtract':
            if (isNumeric) {
                const subtrahend = parseFloat(parameters.value || 0);
                result = numericSourceValue - subtrahend;
                targetField.value = result.toFixed(2);
            }
            break;
            
        case 'multiply':
            if (isNumeric) {
                const multiplier = parseFloat(parameters.value || 1);
                result = numericSourceValue * multiplier;
                targetField.value = result.toFixed(2);
            }
            break;
            
        case 'divide':
            if (isNumeric) {
                const divisor = parseFloat(parameters.value || 1);
                if (divisor !== 0) {
                    result = numericSourceValue / divisor;
                    targetField.value = result.toFixed(2);
                }
            }
            break;
            
        case 'copy':
            // Simple copy
            targetField.value = sourceValue;
            break;
            
        case 'custom_formula':
            // Custom formula using parameters.formula
            if (parameters.formula && isNumeric) {
                try {
                    // Replace placeholders with actual values
                    const formula = parameters.formula.replace(/\{source\}/g, numericSourceValue);
                    
                    // Safely evaluate formula
                    result = Function('"use strict";return (' + formula + ')')();
                    targetField.value = typeof result === 'number' ? result.toFixed(2) : result;
                } catch (e) {
                    console.error('Error evaluating formula:', e);
                }
            }
            break;
            
        default:
            console.warn('Unknown connection type:', connection.connection_type);
    }
    
    // Trigger change event on target field
    const event = new Event('change', { bubbles: true });
    targetField.dispatchEvent(event);
}

// Fetch related data from server
function fetchRelatedValue(connection, sourceValue, targetField) {
    const url = `/api/related-field-value?source_field=${connection.source_name}&source_form=${connection.source_form}&target_field=${connection.target_name}&source_value=${encodeURIComponent(sourceValue)}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.value !== undefined) {
                targetField.value = data.value;
                
                // Trigger change event
                const event = new Event('change', { bubbles: true });
                targetField.dispatchEvent(event);
            }
        })
        .catch(error => {
            console.error('Error fetching related value:', error);
        });
}

// Add a new field connection dynamically
function addFieldConnection(config) {
    fieldConnections.push(config);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initFieldConnections();
});