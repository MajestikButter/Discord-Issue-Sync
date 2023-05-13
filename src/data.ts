import * as fs from "fs";

export interface CommentLink {
  discordId: string;
  gitId: number;
}

export interface IssueLink {
  issueId: number;
  number: number;
  threadId: string;
  forumId: string;
  comments: CommentLink[];
}

const DEFAULT_DATA: {
  issueLinks: IssueLink[];
  lastGitUpdate: string;
} = {
  issueLinks: [],
  lastGitUpdate: new Date(1).toISOString(),
};

function loadFallback(fallback: object, create = false, fillInto?: object) {
  if (!fs.existsSync("data.json")) {
    if (create) {
      fs.writeFileSync("data.json", JSON.stringify(fallback));
    } else {
      throw "No data.json file exists";
    }
  }
  try {
    const contents = fs.readFileSync("data.json");
    const parsed = JSON.parse(`${contents}`);
    return fillInto ? Object.assign(fillInto, parsed) : parsed;
  } catch {
    return fallback;
  }
}

let data: typeof DEFAULT_DATA = loadFallback(DEFAULT_DATA, true, DEFAULT_DATA);
export namespace DataFile {
  export function watchChanges() {
    fs.watch("data.json", (ev) => {
      if (ev !== "change") return;
      data = loadFallback(data);
    });
  }
  export function save() {
    fs.writeFile("data.json", JSON.stringify(data, null, " "), () => {});
  }

  export function getLastUpdate() {
    return data.lastGitUpdate;
  }

  export function setUpdated() {
    data.lastGitUpdate = new Date().toISOString();
  }

  export function createCommentLink(discordId: string, gitId: number): CommentLink {
    return {
      discordId,
      gitId,
    };
  }

  export function hasLink(threadId: string) {
    return data.issueLinks.findIndex((v) => v.threadId == threadId) >= 0;
  }

  export function addLink(
    threadId: string,
    forumId: string,
    issueId: number,
    issueNumber: number,
    comments: CommentLink[]
  ) {
    if (hasLink(threadId)) return;
    const link = {
      issueId,
      threadId,
      forumId,
      number: issueNumber,
      comments,
    };
    data.issueLinks.push(link);
    return link;
  }

  export function getIssueLinks(issueId: number) {
    return data.issueLinks.filter((v) => v.issueId == issueId);
  }
  export function getThreadIds(issueId: number) {
    return getIssueLinks(issueId).map((v) => v.threadId);
  }
  export function getForumThreadId(issueId: number, forumId: string) {
    return data.issueLinks.find((v) => v.issueId == issueId && v.forumId == forumId)?.threadId;
  }
  export function getIssueLinkByThreadId(threadId: string) {
    return data.issueLinks.find((v) => v.threadId == threadId);
  }
  export function getIssueId(threadId: string) {
    return getIssueLinkByThreadId(threadId)?.issueId;
  }
  export function getIssueNumber(threadId: string) {
    return getIssueLinkByThreadId(threadId)?.number;
  }
  export function removeThreadIds(threadIds: string[]) {
    data.issueLinks = data.issueLinks.filter((v) => !threadIds.includes(v.threadId));
  }
}
