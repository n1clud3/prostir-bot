# Prostir Bot

A modular discord bot for the Prostir Discord community.

## Features

- Modular system: turn off features you don't need
- Channel counters
- XP Leveling system
- Ping response: set messages to be randomly given to people who mention a bot
- Short videos downloading (TikTok, Instagram Reels, YouTube Shorts)
- Automated voice channel creation

## Deployment

To deploy the bot, first make sure you have Node.js 20.
After that you need to copy an [example config](./config.example.json),
rename it to `config.json` and fill it up appropriately.
After that, run

```bash
npm run deploycmds
```

This will register commands for the given `guildId` in config.

Start the bot by running

```bash
node .
```

## Used By

This bot is used by the ukrainian Garry's Mod community ["Prostir"](https://discord.gg/stV4JswQ9Q).

## Authors

- [@n1clud3](https://www.github.com/n1clud3)

## License

[MIT](./LICENSE)
