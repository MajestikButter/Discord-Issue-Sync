import * as fs from "fs";

export interface CommentLink {
  discordId: string;
  gitId: number;
}

export interface IssueLink {
  issueId: number;
  number: number;
  threadId: string;
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

export namespace DataFile {
  export let data: typeof DEFAULT_DATA = loadFallback(DEFAULT_DATA, true, DEFAULT_DATA);

  export function watchChanges() {
    fs.watch("data.json", (ev) => {
      if (ev !== "change") return;
      data = loadFallback(data);
    });
  }
  export function save() {
    fs.writeFile("data.json", JSON.stringify(data, null, " "), () => {});
  }

  export function createCommentLink(discordId: string, gitId: number): CommentLink {
    return {
      discordId,
      gitId,
    };
  }

  export function hasLink(issueNumber: number) {
    return data.issueLinks.findIndex((v) => v.number == issueNumber) >= 0;
  }

  export function addLink(threadId: string, issueId: number, issueNumber: number, comments: CommentLink[]) {
    if (hasLink(issueNumber)) return;
    const link = {
      issueId,
      threadId,
      number: issueNumber,
      comments,
    };
    DataFile.data.issueLinks.push(link);
    return link;
  }

  export function getThreadId(issueId: number) {
    return data.issueLinks.find((v) => v.issueId == issueId)?.threadId;
  }
  export function getIssueLinkByNumber(issueNumber: number) {
    return data.issueLinks.find((v) => v.number == issueNumber);
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
}
