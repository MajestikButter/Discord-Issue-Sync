import {
  ForumChannel,
  Message,
  PartialMessage,
  ThreadChannel,
} from "discord.js";
import { Discord } from "./bot";
import { DataFile } from "./data";
import { GitHubApp } from "./githubApp";
import { Snowflake } from "discord.js";
import { ChannelInformation, getChannelInfo } from "./repolink";

function tagsToLabels(forum: ForumChannel, tags: Snowflake[]) {
  const available = forum.availableTags;
  const idMap: { [s: Snowflake]: string } = {};
  for (const t of available) idMap[t.id] = t.name;
  return tags.map((v) => idMap[v]);
}

async function threadCreated(
  channelInfo: ChannelInformation,
  thread: ThreadChannel
) {
  const startMsg = await thread.fetchStarterMessage();
  if (!startMsg) throw "Failed to get thread starting message";

  const issue = await GitHubApp.createIssue(channelInfo.repoInfo, {
    title: thread.name,
    body: startMsg.cleanContent,
    labels: channelInfo.tag ? [channelInfo.tag] : [],
  });
  DataFile.addLink(thread.id, issue.id, issue.number, []);
}

async function threadEdited(
  channelInfo: ChannelInformation,
  thread: ThreadChannel
) {
  const { repoInfo } = channelInfo;
  const link = DataFile.getIssueLinkByThreadId(thread.id);
  // TODO: Handle this better, potentially create a new issue when this happens? Maybe make this a setting?
  if (!link) throw "Failed to get issue";

  const startMsg = await thread.fetchStarterMessage();
  const forum = <ForumChannel>thread.parent;
  const issue = await GitHubApp.getIssue(repoInfo, link.issueId);

  const locked = thread.locked ?? issue.locked;
  if (issue.locked !== thread.locked) {
    await GitHubApp.setIssueLocked(repoInfo, link.number, locked);
  }

  if (locked) return;

  await GitHubApp.editIssue(channelInfo.repoInfo, link.number, {
    title: thread.name,
    body: startMsg?.cleanContent ?? "Starting message not found",
    labels: tagsToLabels(forum, thread.appliedTags),
  });
}

function formatMessage(msg: Message | PartialMessage) {
  const author = msg.author ?? { username: "Unknown", discriminator: "0000" };
  return `### ${author.username}#${author.discriminator}\n${msg.cleanContent}`;
}

function getComment(thread: ThreadChannel, msg: Message | PartialMessage) {
  const link = DataFile.getIssueLinkByThreadId(thread.id);
  if (!link) throw "Failed to get issue";
  const cLink = link.comments.find((v) => v.discordId == msg.id);
  if (!cLink) throw "Failed to get comment";
  return cLink.gitId;
}

async function messageCreated(
  channelInfo: ChannelInformation,
  thread: ThreadChannel,
  msg: Message
) {
  const { repoInfo } = channelInfo;
  const issue = DataFile.getIssueId(thread.id);
  if (!issue) throw "Failed to get issue";
  await GitHubApp.createIssueComment(repoInfo, issue, formatMessage(msg));
}

async function messageEdited(
  channelInfo: ChannelInformation,
  thread: ThreadChannel,
  msg: Message | PartialMessage
) {
  const { repoInfo } = channelInfo;
  const comment = getComment(thread, msg);
  await GitHubApp.editIssueComment(repoInfo, comment, formatMessage(msg));
}

async function messageDeleted(
  channelInfo: ChannelInformation,
  thread: ThreadChannel,
  msg: Message | PartialMessage
) {
  const { repoInfo } = channelInfo;
  const comment = getComment(thread, msg);
  await GitHubApp.deleteIssueComment(repoInfo, comment);
}

Discord.bot.on("threadCreate", (thread) => {
  const channelInfo = getChannelInfo(thread);
  if (!channelInfo) return;
  threadCreated(channelInfo, thread);
});
Discord.bot.on("threadUpdate", (thread) => {
  const channelInfo = getChannelInfo(thread);
  if (!channelInfo) return;
  threadEdited(channelInfo, thread);
});
Discord.bot.on("messageCreate", (msg) => {
  const channel = msg.channel;
  if (!(channel instanceof ThreadChannel)) return;
  const channelInfo = getChannelInfo(channel);
  if (!channelInfo) return;
  messageCreated(channelInfo, channel, msg);
});
Discord.bot.on("messageUpdate", (msg) => {
  const channel = msg.channel;
  if (!(channel instanceof ThreadChannel)) return;
  const channelInfo = getChannelInfo(channel);
  if (!channelInfo) return;
  messageEdited(channelInfo, channel, msg);
});
Discord.bot.on("messageDelete", (msg) => {
  const channel = msg.channel;
  if (!(channel instanceof ThreadChannel)) return;
  const channelInfo = getChannelInfo(channel);
  if (!channelInfo) return;
  messageDeleted(channelInfo, channel, msg);
});
