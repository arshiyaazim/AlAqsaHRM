/**
 * Al-Aqsa Security Field Attendance Tracker
 * Main Application JavaScript
 * Version: 2.0.0
 */

(function() {
  'use strict';
  
  // Initialize the application when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    // Register service worker for PWA functionality
    registerServiceWorker();
    
    // Setup reactive form connections (for dynamic form behavior)
    setupFormConnections();
    
    // Initialize form validation
    initFormValidation();
    
    // Setup auto-suggestions for fields
    setupAutoSuggestions();
    
    // Handle role-specific UI elements
    updateRoleSpecificElements();
  });
  
  /**
   * Register the service worker for PWA support
   */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/static/js/service-worker.js')
          .then(function(registration) {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch(function(error) {
            console.log('ServiceWorker registration failed: ', error);
          });
      });
    }
  }
  
  /**
   * Set up field connections to create reactive form behavior
   */
  function setupFormConnections() {
    // Find all source fields that have connections
    const sourceFields = document.querySelectorAll('[data-source-field]');
    
    sourceFields.forEach(field => {
      field.addEventListener('change', function() {
        const sourceField = this.getAttribute('data-source-field');
        const sourceValue = this.value;
        
        // Find all target fields connected to this source
        const targetFields = document.querySelectorAll(`[data-target-field][data-source="${sourceField}"]`);
        
        targetFields.forEach(async targetField => {
          const connectionType = targetField.getAttribute('data-connection-type');
          
          switch (connectionType) {
            case 'show_related':
              await handleShowRelated(sourceField, sourceValue, targetField);
              break;
            case 'copy':
              handleCopy(sourceValue, targetField);
              break;
            case 'add':
              handleMath(sourceValue, targetField, 'add');
              break;
            case 'subtract':
              handleMath(sourceValue, targetField, 'subtract');
              break;
            case 'multiply':
              handleMath(sourceValue, targetField, 'multiply');
              break;
            case 'divide':
              handleMath(sourceValue, targetField, 'divide');
              break;
            case 'custom_formula':
              handleCustomFormula(sourceValue, targetField);
              break;
          }
        });
      });
    });
  }
  
  /**
   * Handle "show related" connection type - fetches related data
   */
  async function handleShowRelated(sourceField, sourceValue, targetField) {
    if (!sourceValue) {
      targetField.value = '';
      return;
    }
    
    try {
      const response = await fetch(`/api/related_field_value?source_field=${sourceField}&source_value=${encodeURIComponent(sourceValue)}`);
      
      if (response.ok) {
        const data = await response.json();
        targetField.value = data.value || '';
      } else {
        console.error('Error fetching related field value');
      }
    } catch (error) {
      console.error('Failed to fetch related value:', error);
      // In offline mode, try to use cached data
      const offlineValue = localStorage.getItem(`related_${sourceField}_${sourceValue}`);
      if (offlineValue) {
        targetField.value = offlineValue;
      }
    }
  }
  
  /**
   * Handle "copy" connection type
   */
  function handleCopy(sourceValue, targetField) {
    targetField.value = sourceValue;
  }
  
  /**
   * Handle mathematical connection types (add, subtract, multiply, divide)
   */
  function handleMath(sourceValue, targetField, operation) {
    const numericValue = parseFloat(sourceValue) || 0;
    const parameter = parseFloat(targetField.getAttribute('data-parameter')) || 0;
    let result = 0;
    
    switch (operation) {
      case 'add':
        result = numericValue + parameter;
        break;
      case 'subtract':
        result = numericValue - parameter;
        break;
      case 'multiply':
        result = numericValue * parameter;
        break;
      case 'divide':
        result = parameter !== 0 ? numericValue / parameter : 0;
        break;
    }
    
    targetField.value = result.toFixed(2);
  }
  
  /**
   * Handle custom formula connection type
   */
  function handleCustomFormula(sourceValue, targetField) {
    const formula = targetField.getAttribute('data-formula');
    if (!formula) return;
    
    try {
      // Replace {source} with the actual value
      const numericValue = parseFloat(sourceValue) || 0;
      const expression = formula.replace(/\{source\}/g, numericValue);
      
      // Safely evaluate the formula
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${expression}`)();
      targetField.value = result.toFixed(2);
    } catch (error) {
      console.error('Error evaluating formula:', error);
      targetField.value = '';
    }
  }
  
  /**
   * Initialize form validation
   */
  function initFormValidation() {
    // Find all forms that need validation
    const forms = document.querySelectorAll('.needs-validation');
    
    Array.from(forms).forEach(form => {
      form.addEventListener('submit', event => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }
        
        form.classList.add('was-validated');
      }, false);
    });
  }
  
  /**
   * Setup auto-suggestions for input fields
   */
  function setupAutoSuggestions() {
    const autoSuggestFields = document.querySelectorAll('[data-suggestions]');
    
    autoSuggestFields.forEach(field => {
      field.addEventListener('input', debounce(async function() {
        const fieldName = this.getAttribute('name');
        const formId = this.closest('form').getAttribute('data-form-id') || '';
        const query = this.value;
        
        if (query.length < 2) return;
        
        try {
          const response = await fetch(`/api/suggestions?field=${fieldName}&q=${encodeURIComponent(query)}&form_id=${formId}`);
          
          if (response.ok) {
            const suggestions = await response.json();
            showSuggestions(this, suggestions);
          }
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        }
      }, 300));
    });
  }
  
  /**
   * Show suggestions dropdown for input field
   */
  function showSuggestions(inputField, suggestions) {
    // Remove any existing suggestions
    const existingList = document.getElementById('suggestionsList');
    if (existingList) {
      existingList.remove();
    }
    
    if (!suggestions || suggestions.length === 0) return;
    
    // Create suggestions list
    const suggestionsList = document.createElement('ul');
    suggestionsList.id = 'suggestionsList';
    suggestionsList.className = 'suggestions-list';
    
    // Add suggestions
    suggestions.forEach(suggestion => {
      const item = document.createElement('li');
      item.textContent = suggestion;
      item.addEventListener('click', () => {
        inputField.value = suggestion;
        suggestionsList.remove();
      });
      suggestionsList.appendChild(item);
    });
    
    // Position and show suggestions
    const rect = inputField.getBoundingClientRect();
    suggestionsList.style.position = 'absolute';
    suggestionsList.style.top = `${rect.bottom + window.scrollY}px`;
    suggestionsList.style.left = `${rect.left + window.scrollX}px`;
    suggestionsList.style.width = `${rect.width}px`;
    suggestionsList.style.zIndex = '1000';
    
    document.body.appendChild(suggestionsList);
    
    // Close suggestions when clicking outside
    document.addEventListener('click', function closeHandler(e) {
      if (e.target !== inputField && e.target !== suggestionsList) {
        suggestionsList.remove();
        document.removeEventListener('click', closeHandler);
      }
    });
  }
  
  /**
   * Update UI elements based on user role
   */
  function updateRoleSpecificElements() {
    const userRole = document.body.getAttribute('data-role') || '';
    
    // Hide elements not intended for the current role
    document.querySelectorAll('[data-role-access]').forEach(element => {
      const allowedRoles = element.getAttribute('data-role-access').split(',');
      if (!allowedRoles.includes(userRole) && !allowedRoles.includes('all')) {
        element.style.display = 'none';
      }
    });
  }
  
  /**
   * Helper function to debounce function calls
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  /**
   * Show a message toast
   */
  window.showMessage = function(message, type = 'info') {
    // Check if message container exists, create if it doesn't
    let messageContainer = document.getElementById('messageContainer');
    
    if (!messageContainer) {
      messageContainer = document.createElement('div');
      messageContainer.id = 'messageContainer';
      messageContainer.className = 'message-container';
      document.body.appendChild(messageContainer);
      
      // Add some basic styling for the container
      messageContainer.style.position = 'fixed';
      messageContainer.style.top = '20px';
      messageContainer.style.right = '20px';
      messageContainer.style.zIndex = '9999';
      messageContainer.style.maxWidth = '300px';
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `alert alert-${type} alert-dismissible fade show`;
    messageElement.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to container
    messageContainer.appendChild(messageElement);
    
    // Initialize Bootstrap dismissible alert
    new bootstrap.Alert(messageElement);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (messageElement.parentNode === messageContainer) {
        const alert = bootstrap.Alert.getInstance(messageElement);
        if (alert) {
          alert.close();
        } else {
          messageElement.remove();
        }
      }
    }, 5000);
  };
  
})();