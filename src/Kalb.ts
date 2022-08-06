/* Load dotenv */
import "dotenv/config";

/* Load discord.js */
import {
  Client,
  GatewayIntentBits,
  TextChannel,
  CategoryChannel,
  ChannelType,
  CategoryCreateChannelOptions
} from "discord.js";

/* Cron scheduler */
import { CronJob } from "cron";

interface Job {
  name: string;
  category_id: string;
  announcement_channel_id: string;
  creation_message: string;
  deletion_message: string;
  creation_cron: string;
  deletion_cron: string;
}

/* Load the schedule */
import { readFileSync } from "fs";
const raw_data = readFileSync("schedule.json", "utf8");
const { timezone, jobs } = JSON.parse(raw_data) as {
  timezone: string;
  jobs: Array<Job>;
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const cron_jobs: Array<CronJob> = [];

/**
 * @brief Validates the fields of a job.
 *
 * @param job The job to validate.
 * @returns A list of the error(s) encountered.
 */
function validateJob(job: Job) {
  if (!job) {
    return ["The job is undefined."];
  }

  const errors: string[] = [];
  const channel_name_pattern: RegExp = /^[a-zA-Z0-9_-]+$/;
  const id_pattern: RegExp = /^\d+$/;

  if (!job.name || !channel_name_pattern.test(job.name)) {
    errors.push("The voice channel name is invalid.");
  }

  if (!job.category_id || !id_pattern.test(job.category_id)) {
    errors.push("The category ID is invalid.");
  }

  if (
    !job.announcement_channel_id ||
    !id_pattern.test(job.announcement_channel_id)
  ) {
    errors.push("The announcement channel ID is invalid.");
  }

  if (!job.creation_cron) {
    errors.push("The starting cron time is invalid.");
  }

  if (!job.deletion_cron) {
    errors.push("The deletion cron time is invalid.");
  }

  return errors;
}

/**
 * @brief Voice channel creator.
 *
 * @param parent_handle Handle to the category under which the channel will be located.
 * @param channel_name Name of the channel to create.
 * @param announcement_channel_handle Handle to the channel in which the announcement should be posted.
 * @param msg Message to post in the announcement channel.
 * @returns
 */
function createVoiceChannel(
  parent_handle: CategoryChannel,
  channel_name: string,
  announcement_channel_handle: TextChannel | undefined,
  msg: string
) {
  const channel_opts: CategoryCreateChannelOptions = {
    name: channel_name,
    type: ChannelType.GuildVoice
  };
  parent_handle.children
    .create(channel_opts)
    .then(() => {
      console.log(`Channel ${channel_name} was created successfully.`);
      if (announcement_channel_handle && msg) {
        announcement_channel_handle.send(msg);
      }
    })
    .catch((reason: string) => {
      console.error(
        `Error: channel ${channel_name} could not be created: ${reason}`
      );
    });
}

/**
 * @brief Voice channel deleter.
 *
 * @param parent_handle Handle to the category under which the channel is located.
 * @param channel_name Name of the channel to delete.
 * @param announcement_channel_handle Handle to the channel in which the announcement should be posted.
 * @param msg Message to post in the announcement channel.
 * @returns
 */
function deleteVoiceChannel(
  parent_handle: CategoryChannel,
  channel_name: string,
  announcement_channel_handle: TextChannel | undefined,
  msg: string
) {
  const voice_channel = parent_handle.children.cache.find(
    channel => channel.name === channel_name
  );
  if (!voice_channel) {
    console.error(`Could not find voice channel with name ${channel_name}.`);
    return;
  }
  voice_channel
    .delete()
    .then(() => {
      console.log(`Channel ${channel_name} was deleted successfully.`);
      if (announcement_channel_handle && msg) {
        announcement_channel_handle.send(msg);
      }
    })
    .catch((reason: string) => {
      console.error(
        `Error: channel ${channel_name} could not be deleted: ${reason}`
      );
    });
}

/**
 * @brief Performs checks on the job and schedule it.
 *
 * @param job The job to schedule
 */
function addJob(job: Job) {
  const errors = validateJob(job);
  if (errors.length !== 0) {
    console.error(
      "Error: the job will not be scheduled for the following reasons:\n  -",
      errors.join("\n  - ")
    );
    return;
  }

  const parent_category_handle = client.channels.cache.get(job.category_id);
  if (
    !parent_category_handle ||
    parent_category_handle.type !== ChannelType.GuildCategory
  ) {
    console.error(
      "The parent category could not be found.",
      `The voice channel "${job.name}" will not be scheduled.`
    );
    return;
  }

  const announcement_channel_handle = client.channels.cache.get(
    job.announcement_channel_id
  );
  if (announcement_channel_handle?.type !== ChannelType.GuildText) {
    console.error(
      "The announcement channel is not a text channel.",
      `The voice channel "${job.name}" will not be scheduled.`
    );
    return;
  }

  try {
    const creation_job = new CronJob(
      job.creation_cron,
      () =>
        createVoiceChannel(
          parent_category_handle,
          job.name,
          announcement_channel_handle,
          job.creation_message
        ),
      null,
      false,
      timezone
    );
    cron_jobs.push(creation_job);
  } catch {
    console.error(
      `Error: Could not create the channel creation CronJob for "${job.name}", this is most likely due to an invalid cron string or timezone.`
    );
    return;
  }

  try {
    const deletion_job = new CronJob(
      job.deletion_cron,
      () =>
        deleteVoiceChannel(
          parent_category_handle,
          job.name,
          announcement_channel_handle,
          job.deletion_message
        ),
      null,
      false,
      timezone
    );
    cron_jobs.push(deletion_job);
  } catch (err) {
    console.error(
      `Error: Could not create the channel deletion CronJob for "${job.name}", this is most likely due to an invalid cron string or timezone.`
    );
    cron_jobs.pop(); /* Removes the creation job */
    return;
  }
}

/**
 * @brief Starts all scheduled cron jobs.
 */
function startJobs() {
  cron_jobs.forEach(job => job.start());
}

/**
 * @brief Load and start all cron jobs.
 */
function init() {
  console.log("Logged in successfully.\nNow loading jobs...");
  jobs.forEach(addJob);
  console.log("Done!");
  if (cron_jobs.length === 0) {
    console.error("No jobs could be scheduled, exiting.");
    process.exit(-1);
  }
  console.log("Starting all cron jobs...");
  startJobs();
  console.log("Done!");
}

client.on("ready", init);

client.login(process.env.BOT_TOKEN);
