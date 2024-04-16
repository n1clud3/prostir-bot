module.exports = class Logger {  
  /**
   * Message to send to console
   * @param {...any} msg
   */
  static log(...msg) {
    const timestamp = new Date();
    console.log(`[INFO][UTC${timestamp.getUTCHours()}:${timestamp.getUTCMinutes()}:${timestamp.getUTCSeconds()}]`, ...msg);
  }

  /**
   * Warning to send to console
   * @param {...any} msg
   */
  static warn(...msg) {
    const timestamp = new Date();
    console.warn(`[WARN][UTC${timestamp.getUTCHours()}:${timestamp.getUTCMinutes()}:${timestamp.getUTCSeconds()}]`, ...msg);
  }

  /**
   * Error to send to console
   * @param {...any} msg 
   */
  static error(...msg) {
    const timestamp = new Date();
    console.error(`[ERROR][UTC${timestamp.getUTCHours()}:${timestamp.getUTCMinutes()}:${timestamp.getUTCSeconds()}]`, ...msg);
  }
}