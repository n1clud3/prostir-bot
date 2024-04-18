//@ts-check

/**
 * @param {Date} timestamp 
 * @returns {string} formatted UTC string
 */
function generatePaddedTimestamp(timestamp) {
  const hours = timestamp.getUTCHours().toString().padStart(2, "0");
  const minutes = timestamp.getUTCMinutes().toString().padStart(2, "0");
  const seconds = timestamp.getUTCSeconds().toString().padStart(2, "0");
  return hours + ":" + minutes + ":" + seconds
}

/**
   * Message to send to console
   * @param {...any} msg
   */
function log(...msg) {
  const timestamp = generatePaddedTimestamp(new Date());
  console.log(`[UTC${timestamp}][INFO]`, ...msg);
}

/**
 * Warning to send to console
 * @param {...any} msg
 */
function warn(...msg) {
  const timestamp = generatePaddedTimestamp(new Date());
  console.warn(`[UTC${timestamp}][WARN]`, ...msg);
}

/**
 * Error to send to console
 * @param {...any} msg 
 */
function error(...msg) {
  const timestamp = generatePaddedTimestamp(new Date());
  console.error(`[UTC${timestamp}][ERROR]`, ...msg);
}

module.exports = {log, warn, error}