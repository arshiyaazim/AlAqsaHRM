/**
 * Autocomplete functionality for form fields
 * 
 * Usage:
 * <input type="text" 
 *        data-autocomplete="employee_id" 
 *        data-form-id="attendance" 
 *        class="form-control">
 * 
 * The data-autocomplete attribute should contain the field name
 * The data-form-id attribute is optional and specifies which form this field belongs to
 */

// Create a reusable dropdown for all autocomplete inputs
let autocompleteDropdown = null;
let activeAutocompleteField = null;

function initAutocomplete(field) {
    // Skip if already initialized or missing data attribute
    if (field.hasAttribute('data-autocomplete-init') || !field.hasAttribute('data-autocomplete')) {
        return;
    }
    
    // Get field info
    const fieldName = field.getAttribute('data-autocomplete');
    const formId = field.getAttribute('data-form-id') || null;
    
    // Mark as initialized
    field.setAttribute('data-autocomplete-init', 'true');
    
    // Create autocomplete dropdown if it doesn't exist
    if (!autocompleteDropdown) {
        autocompleteDropdown = document.createElement('div');
        autocompleteDropdown.className = 'autocomplete-dropdown';
        autocompleteDropdown.style.display = 'none';
        autocompleteDropdown.style.position = 'absolute';
        autocompleteDropdown.style.zIndex = '1000';
        autocompleteDropdown.style.backgroundColor = '#fff';
        autocompleteDropdown.style.border = '1px solid #ddd';
        autocompleteDropdown.style.borderRadius = '4px';
        autocompleteDropdown.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
        autocompleteDropdown.style.maxHeight = '200px';
        autocompleteDropdown.style.overflowY = 'auto';
        autocompleteDropdown.style.width = '100%';
        document.body.appendChild(autocompleteDropdown);
    }
    
    // Handle input changes
    field.addEventListener('input', function() {
        const value = this.value.trim();
        if (value.length < 2) {
            hideAutocompleteDropdown();
            return;
        }
        
        // Set active field
        activeAutocompleteField = this;
        
        // Position dropdown below input
        const rect = this.getBoundingClientRect();
        autocompleteDropdown.style.top = (rect.bottom + window.scrollY) + 'px';
        autocompleteDropdown.style.left = (rect.left + window.scrollX) + 'px';
        autocompleteDropdown.style.width = rect.width + 'px';
        
        // Fetch suggestions from API
        fetchSuggestions(fieldName, value, formId);
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target !== field && e.target !== autocompleteDropdown) {
            hideAutocompleteDropdown();
        }
    });
    
    // Hide dropdown when field loses focus (unless clicking on dropdown)
    field.addEventListener('blur', function(e) {
        // Small delay to allow clicking on dropdown items
        setTimeout(function() {
            if (document.activeElement !== autocompleteDropdown && 
                !autocompleteDropdown.contains(document.activeElement)) {
                hideAutocompleteDropdown();
            }
        }, 150);
    });
}

function fetchSuggestions(field, query, formId) {
    // Fetch suggestions from API
    let url = `/api/suggestions?field=${field}&q=${encodeURIComponent(query)}`;
    if (formId) {
        url += `&form_id=${formId}`;
    }
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            displaySuggestions(data);
        })
        .catch(error => {
            console.error('Error fetching suggestions:', error);
            hideAutocompleteDropdown();
        });
}

function displaySuggestions(suggestions) {
    // Clear previous suggestions
    autocompleteDropdown.innerHTML = '';
    
    if (!suggestions || suggestions.length === 0) {
        hideAutocompleteDropdown();
        return;
    }
    
    // Create suggestion items
    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.style.padding = '8px 12px';
        item.style.cursor = 'pointer';
        item.style.borderBottom = '1px solid #eee';
        
        // Handle different suggestion formats
        if (typeof suggestion === 'object' && suggestion !== null) {
            if (suggestion.name) {
                item.textContent = suggestion.name;
                item.setAttribute('data-id', suggestion.id);
            } else {
                const firstKey = Object.keys(suggestion)[0];
                item.textContent = suggestion[firstKey];
                
                // Store all properties as data attributes
                for (const key in suggestion) {
                    item.setAttribute(`data-${key}`, suggestion[key]);
                }
            }
        } else {
            item.textContent = suggestion;
        }
        
        // Hover effect
        item.addEventListener('mouseover', function() {
            this.style.backgroundColor = '#f0f0f0';
        });
        
        item.addEventListener('mouseout', function() {
            this.style.backgroundColor = '';
        });
        
        // Handle item selection
        item.addEventListener('click', function() {
            if (activeAutocompleteField) {
                // Set input value
                activeAutocompleteField.value = this.textContent;
                
                // If there's a hidden ID field, set its value
                const idField = document.querySelector(`#${activeAutocompleteField.id}_id`);
                if (idField && this.hasAttribute('data-id')) {
                    idField.value = this.getAttribute('data-id');
                }
                
                // Trigger change event
                const event = new Event('change', { bubbles: true });
                activeAutocompleteField.dispatchEvent(event);
                
                // Hide dropdown
                hideAutocompleteDropdown();
            }
        });
        
        autocompleteDropdown.appendChild(item);
    });
    
    // Show dropdown
    autocompleteDropdown.style.display = 'block';
}

function hideAutocompleteDropdown() {
    if (autocompleteDropdown) {
        autocompleteDropdown.style.display = 'none';
    }
    activeAutocompleteField = null;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    const autocompleteFields = document.querySelectorAll('[data-autocomplete]');
    autocompleteFields.forEach(function(field) {
        initAutocomplete(field);
    });
});