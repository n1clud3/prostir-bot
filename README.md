# prostir-bot

Discord bot for managing the Prostir Discord

## Usage

Follow these steps in order to setup your bot.

1. Clone repo;
2. Copy an [example](./config.example.json) config, rename it to `config.json` and fill it up appropriately;
3. Run `npm run deploycmds` to register commands on your server;
4. Start the bot by running the `node .` command.

### Required permissions and intents

The bot requires all Intents to be enabled.
They are used by `level_system` module to measure message length
and by `channel_counters` to check guild's member count and
member's presence status. They need to be enabled, whether
those modules will be used or not, unless you edit the
[main](./index.js) file.

The bot needs following permissions to be enabled:

- Manage Channels (`voice_managing`)
- Manage Roles (`voice_managing`)
- Move Members (`voice_managing`)
- Send Messages (`level_system`)

## License

Read the [LICENSE](./LICENSE) file.
