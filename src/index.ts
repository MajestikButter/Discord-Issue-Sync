import { Events, ForumChannel } from "discord.js";
import { DataFile } from "./data";
import { Discord } from "./bot";
import "./githubApp";
import "./discordSync";
import { syncAllRepos } from "./issueSync";
import { ENV } from "./env";
import { Config } from "./config";
import { getForumIds } from "./repoLink";
import { syncExistingForum } from "./discordSync";

function minInterval(callback: () => Promise<void>, interval: number) {
  const loop = async () => {
    const began = new Date().getTime();
    await callback();
    const dif = new Date().getTime() - began;
    const rem = interval - dif;
    setTimeout(loop, Math.max(rem, 1));
  };
  setTimeout(loop, interval);
}

setInterval(DataFile.save, 15_000);
DataFile.watchChanges();

minInterval(syncAllRepos, Config.syncInterval);

Discord.bot.on(Events.ClientReady, async (client) => {
  const user = client.user;
  console.log(`[Ready] ${user.username}#${user.discriminator}`);

  for (const forumId of getForumIds()) {
    const forum = await client.channels.fetch(forumId);
    if (!(forum instanceof ForumChannel)) continue;
    await syncExistingForum(forum);
  }
});

Discord.bot.login(ENV.token);
