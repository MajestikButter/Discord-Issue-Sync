import { ForumChannel, ThreadChannel } from "discord.js";
import { RepositoryInformation } from "./githubApp";
import { Discord } from "./bot";
import { GetListedIssueData } from "./types";
import { DataFile, IssueLink } from "./data";

import * as fs from "fs";

export interface ChannelInformation {
  repoInfo: RepositoryInformation;
  label?: string;
}
if (!fs.existsSync("./channels.json")) throw new Error("No channels.json file found");

let channelMap: { [k: string]: ChannelInformation } = {};
try {
  channelMap = JSON.parse(`${fs.readFileSync("./channels.json")}`);

  if (typeof channelMap !== "object" || Array.isArray(channelMap))
    throw new Error("Channels object is of an incorrect type");

  for (const k in channelMap) {
    const def = channelMap[k];
    if (!def.repoInfo) throw new Error("Channel is missing repoInfo");
    if (typeof def !== "object" || Array.isArray(def)) throw new Error("RepoInfo is of an incorrect type");
    const { owner, repo } = def.repoInfo;
    if (!owner || !repo) throw new Error("RepoInfo is missing an owner or repo property");
  }
} catch (e) {
  throw new Error("Failed to parse channels.json: " + e);
}

export function getForumIds() {
  return Object.keys(channelMap);
}

export function getChannelInfo(channel: ThreadChannel | ForumChannel) {
  const forum = channel instanceof ForumChannel ? channel : channel.parent;
  if (!(forum instanceof ForumChannel)) return;
  return channelMap[forum.id];
}

export function getInvalidLinks(issue: GetListedIssueData) {
  const labels = issue.labels.map((v) => (typeof v == "string" ? v : v.name));
  const links = DataFile.getIssueLinks(issue.id);
  const invalid: IssueLink[] = [];
  for (const link of links) {
    const def = channelMap[link.forumId];
    if (!def.label || labels.includes(def.label)) continue;
    invalid.push(link);
  }
  return invalid;
}

export async function getTaggedChannels(repoInfo: RepositoryInformation, labels: string[]) {
  const channels: ForumChannel[] = [];
  for (const id in channelMap) {
    const v = channelMap[id];
    const { owner, repo } = v.repoInfo;
    if (owner != repoInfo.owner || repo != repoInfo.repo) continue;
    if (v.label && !labels.includes(v.label)) continue;
    const channel = await Discord.bot.channels.fetch(id);
    if (!channel || !(channel instanceof ForumChannel)) throw new Error("Failed to get channel");
    channels.push(channel);
  }
  return channels;
}

export function getRepoInfos() {
  const infos: { [s: string]: RepositoryInformation } = {};
  for (const k in channelMap) {
    const c = channelMap[k];
    const info = c.repoInfo;
    infos[`${info.repo}___${info.owner}`] = info;
  }
  return Object.values(infos);
}
