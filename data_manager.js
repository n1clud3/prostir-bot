//@ts-check

const fs = require("node:fs");
const path = require("node:path");
const logger = require("./logging");

/**
 * Reads or creates a data file.
 * @param {string} dfName Name of the data file.
 * @param {any} createData The initial data for the file.
 * @returns
 */
function createDatafile(dfName, createData) {
  const dfPath = path.join("data", dfName + ".json");
  logger.trace("createDatafile dfPath:", path.resolve(dfPath));
  try {
    const buf = fs.readFileSync(dfPath, { encoding: "utf8" });
    logger.trace("Successfully loaded the datafile.");
    return JSON.parse(buf);
  } catch (err) {
    if (err.code === "ENOENT") {
      try {
        const dfData = createData;
        fs.mkdirSync(path.join("data"), { recursive: true });
        fs.writeFileSync(dfPath, JSON.stringify(dfData), { encoding: "utf8" });
        logger.trace("Successfully created the datafile.");
        return dfData;
      } catch (err) {
        return null;
      }
    } else {
      return null;
    }
  }
}

/**
 * Reads a datafile.
 * @param {string} dfName
 * @returns data parsed with JSON.parse() or null
 */
function readDatafile(dfName) {
  const dfPath = path.join("data", dfName + ".json");
  logger.trace("readDatafile dfPath:", path.resolve(dfPath));
  try {
    const buf = fs.readFileSync(dfPath, { encoding: "utf8" });
    logger.trace("Successfully read the datafile.");
    return JSON.parse(buf);
  } catch (err) {
    return null;
  }
}

/**
 * Writes data to a given datafile.
 * @param {string} dfName
 * @param {any} df
 * @returns void or null
 */
function writeDatafile(dfName, df) {
  const dfPath = path.join("data", dfName + ".json");
  logger.trace("writeDatafile dfPath:", path.resolve(dfPath));
  try {
    fs.writeFileSync(dfPath, JSON.stringify(df), { encoding: "utf8" });
    logger.trace("Successfully wrote to the datafile.");
  } catch (err) {
    return null;
  }
}

module.exports = { createDatafile, readDatafile, writeDatafile };
