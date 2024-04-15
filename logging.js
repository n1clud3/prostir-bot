module.exports = class Logger {  
  /**
   * Message to send to console
   * @param {any} msg
   */
  static log(msg) {
    const timestamp = new Date();
    console.log(`[UTC${timestamp.getUTCHours()}:${timestamp.getUTCMinutes()}:${timestamp.getUTCSeconds()}] ${msg}`);
  }
}