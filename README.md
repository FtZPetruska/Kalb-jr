# Kalb-jr

## Archival notice

With the bot no longer being used, this repo has been archived.

Feel free to fork it if you want to use it (and receive dependabot alerts every week).

---

Kalb's first child, reborn from its ashes after a fierce battle against Discord's API.

## How to run

You will first need to install `nodejs` and `yarn`. The latter can be obtained by running `npm i -g yarn` after installing node, or through your package manager on some distros.

To run the bot, you'll first need to provide a token in a file named `.env`:

```
BOT_TOKEN=your.bot.token.here
```

Once everything is setup you can simply run `./run.sh` in the top folder. It will download all the dependencies, compile the the project and run it.

Alternatively, a simple Dockerfile is provided if you wish to containerise your application. Simply run the following commands to build and run the program:

```
docker build -t kalb .
docker run --rm -it kalb
```

Before publishing it, be aware that the `.env` file is included in the image. Moreover, you will need to rebuild the image if you make changes to the schedule.

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

The times for creations are given in the following cron format: `ss mm hh dm mm dw`, more information [here](https://www.npmjs.com/package/cron).

