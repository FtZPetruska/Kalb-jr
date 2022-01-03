# Kalb-jr

Kalb's first child, reborn from its ashes after a fierce battle against Discord's API.

## How to run

You will first need to install `nodejs` and `yarn`. The latter can be obtained by running `npm i -g yarn` after installing node, or through your package manager on some distros.

To install the dependencies simply run `yarn`.

To run the bot, you'll first need to provide a token in a file named `config.json`:
```json
{
  "token": "Your bot's token here"
}
```

Once everything is setup you can simply run `node .`.

## Scheduling things

The `schedule.json` file contains all the scheduled tasks. They consist of:
- The name of the voice channel to create.
- The id of the category in which it will be created.
- The id of a channel in which the announcement will be posted.
- The message to post on creation.
- The message to post on deletion.
- When to create the channel.
- When to delete the channel.

ID can be acquired by turning on Developer Mode in Discord's settings, and right-clicking on the item we want the ID of.

The times for creations are given in the following cron format: `ss mm hh dm mm dw`, more information [here](https://www.npmjs.com/package/node-cron).
