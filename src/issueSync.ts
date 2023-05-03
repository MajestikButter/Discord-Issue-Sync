import { Endpoints } from "@octokit/types";
import { CommentLink, DataFile } from "./data";
import { githubApp } from "./githubApp";
import { Discord } from "./bot";
import { Events, ForumChannel, Message, ThreadChannel } from "discord.js";
import { PartialMessage } from "discord.js";

type GetListedIssueData = Endpoints["GET /repos/{owner}/{repo}/issues"]["response"]["data"][number];

interface RepositoryInformation {
  owner: string;
  repo: string;
}

const labelToForum = {
  // GitHub Issues dev channel
  default: "1102969668551069818",
  // Feedback channels
  bug: "1102676433698037781",
  suggestion: "1102676527428145283",
};

function forumIdFromIssue(issue: GetListedIssueData) {
  for (const label of issue.labels) {
    if (typeof label == "string") {
      const res = labelToForum[label];
      if (res) return res;
    } else if (label.name) {
      const res = labelToForum[label.name];
      if (res) return res;
    }
  }
  return labelToForum.default;
}

const DUNGEON_GAME = {
  owner: "Buttered-Toast-Productions",
  repo: "Dungeon-Game",
};

async function handleIssue(issue: GetListedIssueData) {
  const forumId = forumIdFromIssue(issue);
  const forum = await Discord.bot.channels.fetch(forumId);
  if (!forum) throw `failed to get forum ${forumId}`;
  if (!(forum instanceof ForumChannel)) throw `${forumId} is not a forum channel`;

  await handleIssueForum(issue, forum, DUNGEON_GAME);
}

async function handleIssueForum(issue: GetListedIssueData, forum: ForumChannel, repoInfo: RepositoryInformation) {
  let threadId = DataFile.getThreadId(issue.id);
  let thread: ThreadChannel;

  const tags = issue.labels
    .map((v) => {
      if (typeof v !== "string") v = v.name ?? "";
      const tagData = forum.availableTags.find((t) => t.name == v);
      return tagData?.id ?? "";
    })
    .filter((v) => v);

  if (!threadId) {
    const user = issue.user;
    if (user?.type == "Bot") return;

    thread = await forum.threads.create({
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
        content: issue.body ?? "No content",
      },
      appliedTags: tags,
      reason: "Sync issues from GitHub",
    });
    threadId = thread.id;
  } else {
    const existing = await forum.threads.fetch(threadId);
    if (!existing) throw `failed to get existing thread ${threadId} for issue ${issue.id}`;
    thread = existing;
  }

  const issueLink = DataFile.getIssueLinkByNumber(issue.number);
  if (!issueLink) {
    const comments = (
      await githubApp.request("GET /repos/{owner}/{repo}/issues/{issue_number}/comments", {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        issue_number: issue.number,
      })
    ).data;
    const links: CommentLink[] = [];
    for (const com of comments) {
      const user = com.user;
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
    DataFile.addLink(threadId, issue.id, issue.number, links);
  } else {
    const comResp = await githubApp.request("GET /repos/{owner}/{repo}/issues/{issue_number}/comments", {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      issue_number: issue.number,
      since: DataFile.data.lastGitUpdate,
    });
    const comments = comResp.data;
    const comLinks = issueLink.comments;
    for (const com of comments) {
      const user = com.user;
      if (user?.type == "Bot") continue;
      const resp = {
        embeds: [
          {
            title: "Issue comment",
            url: com.html_url,
            author: {
              name: user?.login ?? "unknown",
              icon_url: user?.avatar_url,
              url: user?.html_url,
            },
          },
        ],
        content: com.body ?? "No content",
      };
      if (com.created_at == com.updated_at) {
        const msg = await thread.send(resp);
        comLinks.push(DataFile.createCommentLink(msg.id, com.id));
      } else {
        const comLink = comLinks.find((v) => v.gitId == com.id);
        if (!comLink) {
          console.warn("failed to get comment link");
          return;
        }
        const msg = await thread.messages.fetch(comLink.discordId);
        if (!msg) {
          console.warn("failed to get discord message");
          return;
        }
        if (!isBotAuthor(msg.author.id)) {
          console.warn("cannot edit a message not belonging to the bot");
          continue;
        }
        await msg.edit(resp);
      }
    }
  }

  const isClosed = issue.state == "closed";
  if (isClosed && !thread.archived) {
    if (!thread.locked) await thread.setLocked(true);
    await thread.setArchived(true);
  } else if (!isClosed) {
    await thread.setArchived(false);
    if (thread.locked) await thread.setLocked(false);
  }

  if (isClosed) return;

  thread.setName(issue.title);
  thread.setAppliedTags(tags);

  if (issue.body) {
    const starterMsg = await thread.fetchStarterMessage();
    if (!starterMsg || !isBotAuthor(starterMsg.author.id)) return;
    starterMsg.edit(issue.body);
  }
}

async function handleThread(
  thread: ThreadChannel,
  opts: { msg?: PartialMessage | Message; msgAction?: "create" | "update" | "delete"; updateChannel?: boolean } = {},
  repoInfo: RepositoryInformation
) {
  console.log(opts);

  const forum = thread.parent;
  if (!(forum instanceof ForumChannel)) return;
  if (!Object.values(labelToForum).includes(forum.id)) return;

  let issueLink = DataFile.getIssueLinkByThreadId(thread.id);
  const ownsThread = opts.msg?.author?.id == thread.ownerId;

  if (opts.msg) {
    const creationDif = opts.msg.createdTimestamp - (thread.createdTimestamp ?? 0);
    if (creationDif < 10) return;
  }

  if (!issueLink) {
    console.log("creating new link:", issueLink);
    const startMsg = await thread.fetchStarterMessage();
    if (!startMsg) {
      throw "failed to get starter message while creating issue";
    }

    const labels = thread.appliedTags
      .map((v) => {
        const d = forum.availableTags.find((t) => t.id == v);
        return d?.name ?? "";
      })
      .filter((v) => v);

    for (const tag in labelToForum) {
      if (labelToForum[tag] == thread.id) {
        labels.push(tag);
        break;
      }
    }

    const res = await githubApp.request("POST /repos/{owner}/{repo}/issues", {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      labels,
      title: thread.name,
      body: startMsg.cleanContent,
    });
    const issue = res.data;
    issueLink = DataFile.addLink(thread.id, issue.id, issue.number, []);

    console.log("created link", issueLink);
    if (!issueLink) throw "failed to create issue link";
  }

  const issueNumber = issueLink.number;

  const ownMsg = opts.msgAction == "update" && ownsThread;
  if (ownMsg || opts.updateChannel) {
    let body: undefined | string;
    if (ownMsg) {
      const starter = await thread.fetchStarterMessage();
      if (starter && starter.id == opts.msg?.id) body = opts.msg.content ?? undefined;
    }
    await githubApp.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      issue_number: issueNumber,
      labels: thread.appliedTags
        .map((v) => {
          const d = forum.availableTags.find((t) => t.id == v);
          return d?.name ?? "";
        })
        .filter((v) => v),
      title: thread.name,
      body,
    });
  }

  if (opts.updateChannel) {
    const issue = (
      await githubApp.request("GET /repos/{owner}/{repo}/issues/{issue_number}", {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        issue_number: issueNumber,
      })
    ).data;

    if (issue.locked !== thread.locked) {
      await githubApp.request("PUT /repos/{owner}/{repo}/issues/{issue_number}/lock", {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        issue_number: issueNumber,
        lock_reason: !issue.locked ? "resolved" : undefined,
      });
    }
  }

  if (opts.msg) {
    const msg = opts.msg;
    const author = msg.author ?? { username: "Unknown", discriminator: "0000" };

    switch (opts.msgAction) {
      case "create": {
        await githubApp.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          issue_number: issueNumber,
          body: `### ${author.username}#${author.discriminator}\n${msg.cleanContent}`,
        });
        break;
      }
      case "update": {
        const link = issueLink.comments.find((v) => v.discordId == msg.id);
        if (!link) {
          console.warn("failed to get comment issue link");
          return;
        }
        await githubApp.request("PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}", {
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          comment_id: link.gitId,
          body: `### ${author.username}#${author.discriminator}\n${msg.cleanContent}`,
        });
        break;
      }
      case "delete": {
        const link = issueLink.comments.find((v) => v.discordId == msg.id);
        if (!link) {
          console.warn("failed to get comment issue link");
          return;
        }
        await githubApp.request("DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}", {
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          comment_id: link.gitId,
        });
        issueLink.comments = issueLink.comments.filter((v) => v.discordId != msg.id);
        break;
      }
    }
  }
}

function isBotAuthor(userId?: string | null) {
  return Discord.bot.user?.id === userId;
}

Discord.bot.on(Events.ThreadCreate, (channel, newlyCreated) => {
  if (!newlyCreated) return;
  if (isBotAuthor(channel.ownerId)) return;
  handleThread(channel, { updateChannel: true }, DUNGEON_GAME);
});
Discord.bot.on(Events.ThreadUpdate, (oldThread, newThread) => {
  handleThread(newThread, { updateChannel: true }, DUNGEON_GAME);
});
Discord.bot.on(Events.ThreadListSync, (threads, guild) => {
  for (const thread of threads.values()) {
    handleThread(thread, { updateChannel: true }, DUNGEON_GAME);
  }
});
Discord.bot.on(Events.MessageCreate, (msg) => {
  if (isBotAuthor(msg.author?.id)) return;
  const channel = msg.channel;
  if (channel instanceof ThreadChannel) {
    handleThread(channel, { msg, msgAction: "create" }, DUNGEON_GAME);
  }
});
Discord.bot.on(Events.MessageUpdate, (msg) => {
  if (isBotAuthor(msg.author?.id)) return;
  const channel = msg.channel;
  if (channel instanceof ThreadChannel) {
    handleThread(channel, { msg, msgAction: "update" }, DUNGEON_GAME);
  }
});
Discord.bot.on(Events.MessageDelete, (msg) => {
  if (msg.channel instanceof ThreadChannel) handleThread(msg.channel, { msg, msgAction: "delete" }, DUNGEON_GAME);
});

export namespace IssueSync {
  export async function syncFromLastGitHubUpdate() {
    const issues = await githubApp.request("GET /repos/{owner}/{repo}/issues", {
      owner: DUNGEON_GAME.owner,
      repo: DUNGEON_GAME.repo,
      since: DataFile.data.lastGitUpdate,
      sort: "updated",
      state: "all",
    });

    if (issues.data.length <= 0) return;

    await Promise.allSettled(issues.data.map((v) => handleIssue(v)));
    DataFile.data.lastGitUpdate = new Date().toISOString();
  }
}
