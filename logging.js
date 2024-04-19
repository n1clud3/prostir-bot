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
   * Debug message to send to console.
   * Will be shown only if process.env.DEBUG exists.
   * @param {...any} msg
   */
function debug(...msg) {
  if (!process.env.DEBUG) return;
  const timestamp = generatePaddedTimestamp(new Date());
  console.log(`[UTC${timestamp}][DEBUG]`, ...msg);
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

module.exports = {debug, log, warn, error}