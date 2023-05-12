import { ForumChannel, ThreadChannel } from "discord.js";
import { RepositoryInformation } from "./githubApp";
import { Discord } from "./bot";

const DUNGEON_GAME = {
  owner: "Buttered-Toast-Productions",
  repo: "Dungeon-Game",
};

export interface ChannelInformation {
  repoInfo: RepositoryInformation;
  tag?: string;
}
const channelMap: { [k: string]: ChannelInformation } = {
  "1102969668551069818": { repoInfo: DUNGEON_GAME },
};

export function getChannelInfo(thread: ThreadChannel) {
  const parent = thread.parent;
  if (!(parent instanceof ForumChannel)) return;
  return channelMap[parent.id];
}

export async function getTaggedChannels(tags: string[]) {
  const channels: ForumChannel[] = [];
  for (const id in channelMap) {
    const v = channelMap[id];
    if (!v.tag || !tags.includes(v.tag)) continue;
    const channel = await Discord.bot.channels.fetch(id);
    if (!channel || !(channel instanceof ForumChannel))
      throw "Failed to get channel";
    channels.push(channel);
  }
  return channels;
}
