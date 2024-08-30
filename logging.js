module.exports = class Logger {
  constructor(name) {
    this.name = name;
  }

  /**
   * @param {Date} timestamp
   * @returns {string} formatted UTC string
   */
  #generatePaddedTimestamp(timestamp) {
    const hours = timestamp.getUTCHours().toString().padStart(2, "0");
    const minutes = timestamp.getUTCMinutes().toString().padStart(2, "0");
    const seconds = timestamp.getUTCSeconds().toString().padStart(2, "0");
    return hours + ":" + minutes + ":" + seconds;
  }

  /**
   * Debug message to send to console.
   * Will be shown only if process.env.DEBUG exists.
   * @param {...any} msg
   */
  trace(...msg) {
    if (!process.env.TRACE) return;
    const timestamp = this.#generatePaddedTimestamp(new Date());
    console.log(`[UTC${timestamp}][${this.name}][TRACE]`, ...msg);
  }

  /**
   * Message to send to console
   * @param {...any} msg
   */
  log(...msg) {
    const timestamp = this.#generatePaddedTimestamp(new Date());
    console.log(`[UTC${timestamp}][${this.name}][INFO]`, ...msg);
  }

  /**
   * Warning to send to console
   * @param {...any} msg
   */
  warn(...msg) {
    const timestamp = this.#generatePaddedTimestamp(new Date());
    console.warn(`[UTC${timestamp}][${this.name}][WARN]`, ...msg);
  }

  /**
   * Error to send to console
   * @param {...any} msg
   */
  error(...msg) {
    const timestamp = this.#generatePaddedTimestamp(new Date());
    console.error(`[UTC${timestamp}][${this.name}][ERROR]`, ...msg);
  }
};
