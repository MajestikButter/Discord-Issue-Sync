import * as dotenv from "dotenv";
dotenv.config();

import { Events } from "discord.js";
import { DataFile } from "./data";
import { Discord } from "./bot";
import "./githubApp";
import "./discordSync";
import { syncAllRepos } from "./issueSync";

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

minInterval(syncAllRepos, 6_000);

Discord.bot.on(Events.ClientReady, async (client) => {
  const user = client.user;
  console.log(`[Ready] ${user.username}#${user.discriminator}`);
});

Discord.bot.login(process.env.TOKEN);
