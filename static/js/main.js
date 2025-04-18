/**
 * Field Attendance Tracker - Main JavaScript File
 * This file contains common functionality used throughout the application
 */

// Close alerts automatically after 5 seconds
document.addEventListener('DOMContentLoaded', function() {
    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(function(alert) {
        setTimeout(function() {
            const closeButton = alert.querySelector('.btn-close');
            if (closeButton) {
                closeButton.click();
            } else {
                alert.classList.remove('show');
                // Remove the alert after the fade animation completes
                setTimeout(function() {
                    if (alert.parentNode) {
                        alert.parentNode.removeChild(alert);
                    }
                }, 500);
            }
        }, 5000);
    });

    // Activate all tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    if (tooltipTriggerList.length) {
        [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }

    // PWA Service Worker Registration
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

    // Handle offline status
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    function updateOnlineStatus() {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            if (navigator.onLine) {
                statusElement.textContent = 'Online';
                statusElement.classList.remove('text-danger');
                statusElement.classList.add('text-success');
            } else {
                statusElement.textContent = 'Offline';
                statusElement.classList.remove('text-success');
                statusElement.classList.add('text-danger');
            }
        }
    }
});