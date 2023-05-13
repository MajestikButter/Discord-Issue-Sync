import { ForumChannel, Message, PartialMessage, ThreadChannel } from "discord.js";
import { Discord } from "./bot";
import { DataFile } from "./data";
import { GitHubApp } from "./githubApp";
import { Snowflake } from "discord.js";
import { ChannelInformation, getChannelInfo } from "./repoLink";

function tagsToLabels(forum: ForumChannel, tags: Snowflake[], labels: string[]) {
  const available = forum.availableTags;
  const idMap: { [s: Snowflake]: string } = {};
  for (const t of available) idMap[t.id] = t.name;

  const newLabels: { [k: string]: true } = {};
  for (const label of labels) {
    if (!Object.values(idMap).find((v) => v == label)) {
      newLabels[label] = true;
      continue;
    }
    if (!tags.includes(label)) continue;
    newLabels[label] = true;
  }
  for (const tag of tags) newLabels[idMap[tag]] = true;

  return Object.keys(newLabels);
}

async function threadCreated(channelInfo: ChannelInformation, thread: ThreadChannel) {
  const startMsg = await thread.fetchStarterMessage();
  if (!startMsg) throw new Error("Failed to get thread starting message");

  const issue = await GitHubApp.createIssue(channelInfo.repoInfo, {
    title: thread.name,
    body: startMsg.cleanContent,
    labels: channelInfo.label ? [channelInfo.label] : [],
    state: "open",
  });
  DataFile.addLink(thread.id, thread.parentId!, issue.id, issue.number, []);
}

async function threadEdited(channelInfo: ChannelInformation, thread: ThreadChannel) {
  const { repoInfo } = channelInfo;
  const link = DataFile.getIssueLinkByThreadId(thread.id);
  // TODO: Handle this better, potentially create a new issue when this happens? Maybe make this a setting?
  if (!link) throw new Error("Failed to get issue");

  const startMsg = await thread.fetchStarterMessage();
  const forum = <ForumChannel>thread.parent;
  const issue = await GitHubApp.getIssue(repoInfo, link.number);

  const locked = thread.locked ?? issue.locked;
  if (issue.locked !== thread.locked) {
    await GitHubApp.setIssueLocked(repoInfo, link.number, locked);
  }

  // if (locked) return;
  const state = thread.archived ? "closed" : "open";
  const labels = tagsToLabels(
    forum,
    thread.appliedTags,
    issue.labels.map((v) => (typeof v == "string" ? v : v.name ?? ""))
  );

  await GitHubApp.editIssue(channelInfo.repoInfo, link.number, {
    title: thread.name,
    body: startMsg?.cleanContent ?? "Starting message not found",
    labels,
    state,
  });
}

function formatMessage(msg: Message | PartialMessage) {
  const author = msg.author ?? { username: "Unknown", discriminator: "0000" };
  return `### ${author.username}#${author.discriminator}\n${msg.cleanContent}`;
}

function getComment(thread: ThreadChannel, msg: Message | PartialMessage) {
  const link = DataFile.getIssueLinkByThreadId(thread.id);
  if (!link) throw new Error("Failed to get issue");
  const cLink = link.comments.find((v) => v.discordId == msg.id);
  if (!cLink) throw new Error("Failed to get comment");
  return cLink.gitId;
}

async function messageCreated(channelInfo: ChannelInformation, thread: ThreadChannel, msg: Message) {
  const { repoInfo } = channelInfo;
  const issue = DataFile.getIssueLinkByThreadId(thread.id);
  if (!issue) throw new Error("Failed to get issue");
  const comment = await GitHubApp.createIssueComment(repoInfo, issue.number, formatMessage(msg));
  issue.comments.push(DataFile.createCommentLink(msg.id, comment.id));
}

async function messageEdited(channelInfo: ChannelInformation, thread: ThreadChannel, msg: Message | PartialMessage) {
  const { repoInfo } = channelInfo;
  const comment = getComment(thread, msg);
  await GitHubApp.editIssueComment(repoInfo, comment, formatMessage(msg));
}

async function messageDeleted(channelInfo: ChannelInformation, thread: ThreadChannel, msg: Message | PartialMessage) {
  const { repoInfo } = channelInfo;
  const comment = getComment(thread, msg);
  await GitHubApp.deleteIssueComment(repoInfo, comment);
}

function isBot(id?: string | null) {
  return id == Discord.bot.user?.id;
}

Discord.bot.on("threadCreate", async (thread) => {
  if (isBot(thread.ownerId)) return;
  const channelInfo = getChannelInfo(thread);
  if (!channelInfo) return;
  try {
    await threadCreated(channelInfo, thread);
  } catch (e) {
    console.warn("[Request Failed]", e);
  }
});
Discord.bot.on("threadUpdate", async (_, thread) => {
  const channelInfo = getChannelInfo(thread);
  // TODO: Implement check to prevent update loop between git and discord
  if (!channelInfo) return;
  try {
    await threadEdited(channelInfo, thread);
  } catch (e) {
    console.warn("[Request Failed]", e);
  }
});
Discord.bot.on("messageCreate", async (msg) => {
  if (isBot(msg.author.id)) return;
  const channel = msg.channel;
  if (msg.system) return;
  if (!(channel instanceof ThreadChannel)) return;
  const channelInfo = getChannelInfo(channel);
  if (!channelInfo) return;
  try {
    await messageCreated(channelInfo, channel, msg);
  } catch (e) {
    console.warn("[Request Failed]", e);
  }
});
Discord.bot.on("messageUpdate", async (msg) => {
  if (isBot(msg.author?.id)) return;
  const channel = msg.channel;
  if (msg.system) return;
  if (!(channel instanceof ThreadChannel)) return;
  const channelInfo = getChannelInfo(channel);
  if (!channelInfo) return;
  try {
    await messageEdited(channelInfo, channel, msg);
  } catch (e) {
    console.warn("[Request Failed]", e);
  }
});
Discord.bot.on("messageDelete", async (msg) => {
  if (isBot(msg.author?.id)) return;
  const channel = msg.channel;
  if (msg.system) return;
  if (!(channel instanceof ThreadChannel)) return;
  const channelInfo = getChannelInfo(channel);
  if (!channelInfo) return;
  try {
    await messageDeleted(channelInfo, channel, msg);
  } catch (e) {
    console.warn("[Request Failed]", e);
  }
});
