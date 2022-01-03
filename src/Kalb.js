// Necessary discord.js classes
const { Client, Intents, TextChannel, CategoryChannel } = require('discord.js');
const { token } = require('../config.json');

// Scheduler
const { CronJob } = require('cron');

// Fetch all scheduling data
const { timezone, jobs } = require('../schedule.json');

let cron_jobs = [];
let channel_handles = [];
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

/**
 * Get the handle associated to an id.
 * 
 * @param {string} id The id of a channel or category.
 * @returns The handle to the channel or category.
 * 
 * @note The handle is cached to avoid spamming the discord API.
 */
function get_handle(id) {
    let idx = channel_handles.findIndex(handle => handle["id"] === id);
    if (idx === -1) {
        let new_handle = client.channels.cache.get(id)
        channel_handles.push({ "id": id, "handle": new_handle });
        return new_handle;
    }
    return channel_handles[idx]["handle"];
}

/**
 * Schedules the creation and deletion of a voice channel.
 * 
 * @param {Object} job All the info about the channel to create.
 */
function add_job(job) {
    let parent_handle = get_handle(job["category_id"]);
    let announcement_handle = get_handle(job["announcement_channel_id"]);
    cron_jobs.push(
        new CronJob(
            job["creation_cron"],
            () => create_voice_channel(parent_handle, job["name"], announcement_handle, job["creation_message"]),
            null,
            false,
            timezone
        ),
        new CronJob(
            job["deletion_cron"],
            () => delete_voice_channel(job["name"], announcement_handle, job["deletion_message"]),
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
    cron_jobs.forEach(job => job.start());
}

/**
 * Create a new voice channel.
 * 
 * @param {CategoryChannel} parent A handle to the parent category on which the channel will be created.
 * @param {string} channel_name The name to give to the voice channel.
 * @param {TextChannel} announcement_channel A handle to the channel on which the announcement will be posted.
 * @param {string} msg The message to post.
 */
function create_voice_channel(parent, channel_name, announcement_channel, msg) {
    parent.createChannel(channel_name, { type: "GUILD_VOICE" }).then(() => {
        if (msg) { announcement_channel.send(msg); }
    });
}

/**
 * Deletes a voice channel.
 * 
 * @param {string} channel_name The name of the channel to delete.
 * @param {TextChannel} announcement_channel A handle to the channel on which the announcement will be posted.
 * @param {string} msg The message to post.
 */
function delete_voice_channel(channel_name, announcement_channel, msg) {
    client.channels.cache.find(channel => channel.name === channel_name)?.delete().then(() => {
        if (msg) { announcement_channel.send(msg); }
    });
}

client.on('ready', () => {
    console.log("Beep boop, I'm alive");
    console.log("Now loading jobs...");
    jobs.forEach(job => add_job(job));
    console.log("Done!")
    console.log("Starting all cron jobs...");
    start_jobs();
    console.log("Done!");
});

client.login(token);
