//@ts-check

const logger = require("./logging");
const sqlite3 = require("sqlite3").verbose();
const data_manager = require("./data_manager");

process.env.DEBUG = "1";
const dfName = "level_system_db";

logger.log("Commencing DB conversion...");

logger.log('Converting "levels_data" table into "level_system_db" datafile.');
const db = new sqlite3.Database("bot.db");
let df = data_manager.createDatafile(dfName, {});

if (df === null) {
  logger.error("Failed to read or create a datafile.");
  process.exit(-1);
}

db.all("SELECT * FROM levels_data", (err, rows) => {
  if (err) {
    logger.error("DB", err);
    process.exit(-1);
  }

  if (rows) {
    for (const row of rows) {
      logger.log(row, rows[row]);
      if (!df[row.uid]) {
        df[row.uid] = {};
      }
      df[row.uid].xp = row.xp;
    }
    data_manager.writeDatafile(dfName, df);
    logger.log('Congratulations! "bot.db" was converted into "level_system_db.json"!');
    logger.log('Remove the "_db" from a new datafile to make it work with new bot code.');
  }
});
db.close();
