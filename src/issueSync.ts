import { CommentLink, DataFile } from "./data";
import { GitHubApp, RepositoryInformation } from "./githubApp";
import { ForumChannel, Snowflake, ThreadChannel } from "discord.js";
import { getInvalidLinks, getRepoInfos, getTaggedChannels } from "./repoLink";
import { Discord } from "./bot";
import { GetListedIssueData } from "./types";

function labelsToTags(forum: ForumChannel, labels: GetListedIssueData["labels"]) {
  const available = forum.availableTags;
  const idMap: { [s: string]: Snowflake } = {};
  for (const t of available) idMap[t.name] = t.id;
  return labels.map((v) => idMap[typeof v == "string" ? v : v.name ?? ""]).filter((v) => v);
}

async function handleComments(
  thread: ThreadChannel,
  repoInfo: RepositoryInformation,
  issueNumber: number,
  since?: string,
  ignoreBot = false
) {
  const comments = await GitHubApp.getIssueComments(repoInfo, issueNumber, since);
  const links: CommentLink[] = [];
  for (const com of comments) {
    const user = com.user;
    if (ignoreBot && user?.type == "Bot") continue;
    const msg = await thread.send({
      embeds: [
        {
          title: "Issue comment",
          url: com.html_url,
          author: {
            name: user?.login ?? "unknown",
            icon_url: user?.avatar_url,
            url: user?.html_url,
          },
          description: com.body,
        },
      ],
    });
    links.push(DataFile.createCommentLink(msg.id, com.id));
  }
  return links;
}

export async function createIssue(repoInfo: RepositoryInformation, issue: GetListedIssueData, forum: ForumChannel) {
  const user = issue.user;
  const thread = await forum.threads.create({
    name: issue.title,
    message: {
      embeds: [
        {
          title: `Issue #${issue.number}`,
          url: issue.html_url,
          author: {
            name: user?.login ?? "unknown",
            icon_url: user?.avatar_url,
            url: user?.html_url,
          },
          description: "",
        },
      ],
      content: issue.body ?? "No original message",
    },
    appliedTags: labelsToTags(forum, issue.labels),
  });
  const links = await handleComments(thread, repoInfo, issue.number);
  DataFile.addLink(thread.id, forum.id, issue.id, issue.number, links);
}
export async function editIssue(
  repoInfo: RepositoryInformation,
  issue: GetListedIssueData,
  forum: ForumChannel,
  thread: ThreadChannel
) {
  // TODO: Implement check to prevent update loop between git and discord
  const link = DataFile.getIssueLinkByThreadId(thread.id);
  if (!link) throw new Error("failed to get issue link");

  if ((issue.state == "closed") != thread.archived) await thread.setArchived(issue.state == "closed");
  if (thread.archived) return;

  if (thread.name != issue.title) await thread.setName(issue.title);

  thread.setAppliedTags(labelsToTags(forum, issue.labels));

  const startMsg = await thread.fetchStarterMessage();
  if (startMsg && startMsg.author.id == Discord.bot.user?.id) {
    const cont = startMsg.cleanContent;
    if (issue.body !== cont) startMsg.content = issue.body ?? "No original message";
  }

  const links = await handleComments(thread, repoInfo, issue.number, DataFile.getLastUpdate(), true);
  link.comments.push(...links);
}

export async function syncIssues(repoInfo: RepositoryInformation) {
  const issues = await GitHubApp.getIssues(repoInfo, DataFile.getLastUpdate());

  if (issues.length <= 0) return;

  await Promise.allSettled(
    issues.map((issue) =>
      (async () => {
        const labels = issue.labels.map((v) => (typeof v == "string" ? v : v.name ?? ""));
        const forums = await getTaggedChannels(repoInfo, labels);

        for (const channel of forums) {
          const threadId = DataFile.getForumThreadId(issue.id, channel.id);

          if (!threadId) {
            await createIssue(repoInfo, issue, channel);
          } else {
            const thread = await channel.threads.fetch(threadId);
            if (!thread) throw new Error("failed to get thread");
            await editIssue(repoInfo, issue, channel, thread);
          }
        }

        const invalidLinks = getInvalidLinks(issue);
        for (const invalid of invalidLinks) {
          const forum = await Discord.bot.channels.fetch(invalid.forumId);
          if (!(forum instanceof ForumChannel)) continue;
          const thread = await forum.threads.fetch(invalid.threadId);
          if (!thread) continue;
          await thread.delete();
        }
        DataFile.removeThreadIds(invalidLinks.map((v) => v.threadId));
      })()
    )
  );
}

export async function syncAllRepos() {
  await Promise.allSettled(getRepoInfos().map((v) => syncIssues(v)));
  DataFile.setUpdated();
}
