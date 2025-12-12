/**
 * Format error messages from API responses for display
 * Handles both string errors and FastAPI validation error objects
 * 
 * @param {*} error - Error from API response
 * @returns {string} Formatted error message
 */
export const formatErrorMessage = (error) => {
  // If error is already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // If error is an array (FastAPI validation errors)
  if (Array.isArray(error)) {
    return error.map(err => {
      // Format: "field: message"
      const field = err.loc ? err.loc.join(' > ') : 'Field';
      const message = err.msg || 'Validation error';
      return `${field}: ${message}`;
    }).join(', ');
  }

  // If error is an object with a message property
  if (error && typeof error === 'object') {
    if (error.message) return error.message;
    if (error.msg) return error.msg;
    if (error.detail) return formatErrorMessage(error.detail);
    // Try to stringify the object as last resort
    try {
      return JSON.stringify(error);
    } catch {
      return 'An error occurred';
    }
  }

  // Default fallback
  return 'An unexpected error occurred';
};

/**
 * Extract and format error from axios error response
 * 
 * @param {*} err - Axios error object
 * @param {string} fallbackMessage - Default message if error cannot be extracted
 * @returns {string} Formatted error message
 */
export const getErrorMessage = (err, fallbackMessage = 'An error occurred') => {
  if (!err) return fallbackMessage;
  
  // Check for response data
  if (err.response && err.response.data) {
    const { detail, message, error } = err.response.data;
    
    // Try detail first (FastAPI standard)
    if (detail) {
      return formatErrorMessage(detail);
    }
    
    // Try message
    if (message) {
      return formatErrorMessage(message);
    }
    
    // Try error
    if (error) {
      return formatErrorMessage(error);
    }
  }
  
  // Check for error message directly
  if (err.message) {
    return err.message;
  }
  
  return fallbackMessage;
};