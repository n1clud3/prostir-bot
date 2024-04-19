//@ts-check

const { REST, Routes } = require("discord.js");
const config = require("./config.json");
const fs = require("node:fs");
const path = require("node:path");
const logger = require("./logging")

const commands = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'modules');
const modulesFolders = fs.readdirSync(foldersPath);

for (const folder of modulesFolders) {
	// Grab all the command files from the commands directory you created earlier
  logger.log(folder);
	const commandsPath = path.join(foldersPath, folder, "commands");
  try {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
      } else {
        logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      logger.warn("Skipped", error.path);
      continue;
    } else {
      logger.error(error);
    }
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.token);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(config.clientId, config.guildId),
			{ body: commands },
		);

    //@ts-ignore
		logger.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		logger.error(error);
	}
})();