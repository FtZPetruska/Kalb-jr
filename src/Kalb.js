// Load the dotenv
require('dotenv').config()

// Necessary discord.js classes
const {
  Client,
  Intents,
  AnyChannel,
  CategoryChannel,
  TextChannel,
} = require("discord.js");

// Scheduler
const { CronJob } = require("cron");

// Fetch all scheduling data
const { timezone, jobs } = require("../schedule.json");

let cron_jobs = [];
let channel_handles = [];
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

/**
 * Get the handle associated to an id.
 *
 * @param {string} id The id of a channel or category.
 * @returns {AnyChannel|undefined} The handle to the channel or category.
 *
 * @note The handle is cached to avoid spamming the discord API.
 */
function get_handle(id) {
  let idx = channel_handles.findIndex((handle) => handle["id"] === id);
  if (idx === -1) {
    let new_handle = client.channels.cache.get(id);
    if (new_handle) {
      channel_handles.push({ id: id, handle: new_handle });
    }
    return new_handle;
  }
  return channel_handles[idx]["handle"];
}

/**
 * Performs simple checks on a job.
 *
 * @param {Object} job The job to test.
 * @returns {Array} An array that contains:
 *  - a boolean to indicate whether the job should be scheduled.
 *  - a list of the reasons why the job won't be scheduled.
 */
function validate_job(job) {
  if (!job) {
    return [false, "\t- The job is undefined."];
  }

  let is_valid = true;
  let reasons = [];

  if (!job?.name || job.name.search(" ") !== -1) {
    is_valid = false;
    reasons.push("\t- The voice channel name is invalid.");
  }

  if (!job?.category_id || isNaN(job.category_id)) {
    is_valid = false;
    reasons.push(
      "\t- The ID of the category to add the voice channel to is invalid."
    );
  }

  if (!job?.creation_cron) {
    is_valid = false;
    reasons.push("\t- The starting cron time is invalid.");
  }

  if (!job?.deletion_cron) {
    is_valid = false;
    reasons.push("\t- The deletion cron time is invalid.");
  }

  return [is_valid, reasons];
}

/**
 * Schedules the creation and deletion of a voice channel.
 *
 * @param {Object} job All the info about the channel to create.
 */
function add_job(job) {
  const [is_valid, reasons] = validate_job(job);
  if (!is_valid) {
    console.error(
      "Error: the job won't be scheduled for the following reasons:\n",
      reasons.join("\n")
    );
    return;
  }

  let parent_handle = get_handle(job["category_id"]);
  if (!parent_handle) {
    console.error(
      `The parent category couldn't be found, the voice channel "${job?.name}" will not be scheduled.`
    );
    return;
  }
  let announcement_handle = get_handle(job["announcement_channel_id"]);
  cron_jobs.push(
    new CronJob(
      job["creation_cron"],
      () =>
        create_voice_channel(
          parent_handle,
          job["name"],
          announcement_handle,
          job["creation_message"]
        ),
      null,
      false,
      timezone
    ),
    new CronJob(
      job["deletion_cron"],
      () =>
        delete_voice_channel(
          job["name"],
          announcement_handle,
          job["deletion_message"]
        ),
      null,
      false,
      timezone
    )
  );
}

/**
 * Starts all the cron jobs.
 */
function start_jobs() {
  cron_jobs.forEach((job) => job.start());
}

/**
 * Create a new voice channel.
 *
 * @param {CategoryChannel} parent A handle to the parent category on which the channel will be created.
 * @param {string} channel_name The name to give to the voice channel.
 * @param {TextChannel|undefined} announcement_channel A handle to the channel on which the announcement will be posted.
 * @param {string} msg The message to post.
 */
function create_voice_channel(parent, channel_name, announcement_channel, msg) {
  parent.createChannel(channel_name, { type: "GUILD_VOICE" }).then(() => {
    if (msg) {
      announcement_channel?.send(msg);
    }
  });
}

/**
 * Deletes a voice channel.
 *
 * @param {string} channel_name The name of the channel to delete.
 * @param {TextChannel | undefined} announcement_channel A handle to the channel on which the announcement will be posted.
 * @param {string} msg The message to post.
 */
function delete_voice_channel(channel_name, announcement_channel, msg) {
  client.channels.cache
    .find((channel) => channel.name === channel_name)
    ?.delete()
    .then(() => {
      if (msg) {
        announcement_channel?.send(msg);
      }
    });
}

client.on("ready", () => {
  console.log("Beep boop, I'm alive");
  console.log("Now loading jobs...");
  jobs.forEach(add_job);
  console.log("Done!");
  console.log("Starting all cron jobs...");
  start_jobs();
  console.log("Done!");
});

client.login(process.env.BOT_TOKEN);
