/**
 * Date utility functions for formatting dates and times
 */

/**
 * Format a date string or Date object according to the provided options
 * @param {string|Date} date - The date to format
 * @param {Intl.DateTimeFormatOptions} options - Formatting options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
}

/**
 * Format a date string or Date object as date and time according to the provided options
 * @param {string|Date} date - The date to format
 * @param {Intl.DateTimeFormatOptions} options - Formatting options
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(date, options = {}) {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
}

/**
 * Format a date string or Date object as a short date (MM/DD/YYYY)
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted short date string
 */
export function formatShortDate(date) {
  return formatDate(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Format a date string or Date object as time only (HH:MM)
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted time string
 */
export function formatTime(date) {
  return formatDateTime(date, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format a date string or Date object as YYYY-MM-DD (for API calls)
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export function formatDateForAPI(date) {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

