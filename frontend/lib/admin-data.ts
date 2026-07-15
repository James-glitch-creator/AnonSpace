export type ContentType = "Post" | "Comment";

export type ReviewItem = {
  id: string;
  handle: string;
  about: string;
  type: ContentType;
  upvotes: number;
  downvotes: number;
};

export type AutoBanItem = {
  id: string;
  about: string;
  type: ContentType;
  community: string;
  finalRatio: number;
};

export type ReportItem = {
  id: string;
  content: string;
  reason: string;
  community: string;
  reports: number;
};

export const overviewStats = [
  {
    label: "Encrypted accounts",
    value: "18,204",
    note: "+312 this week",
    trend: "up" as const,
  },
  {
    label: "Auto-bans today",
    value: "18",
    note: "1 on yesterday",
    trend: "up" as const,
  },
  {
    label: "Content near 25% line",
    value: "6",
    note: "awaiting outcome",
    trend: "neutral" as const,
  },
  {
    label: "Active communities",
    value: "872",
    note: "+7 this week",
    trend: "up" as const,
  },
];

export const categoryOptions = [
  "All Categories",
  "Posts",
  "Comments",
  "Latest Posts",
  "Popular Posts",
  "Community",
];

export const autoBanCategoryOptions = [
  "All Categories",
  "Post Only",
  "Comment Only",
  "Last 24 Hours",
  "This week",
  "This month",
];

export const reviewQueue: ReviewItem[] = [
  {
    id: "3485",
    handle: "Anonymous #3485",
    about: "Unpopular opinion about the new office parking policy",
    type: "Post",
    upvotes: 545,
    downvotes: 25,
  },
  {
    id: "7855",
    handle: "Anonymous #7855",
    about: "Unpopular opinion about the new office parking policy",
    type: "Comment",
    upvotes: 45,
    downvotes: 5,
  },
  {
    id: "645",
    handle: "Anonymous #645",
    about: "Unpopular opinion about the new office parking policy",
    type: "Post",
    upvotes: 85,
    downvotes: 129,
  },
  {
    id: "99",
    handle: "Anonymous #99",
    about: "Unpopular opinion about the new office parking policy",
    type: "Comment",
    upvotes: 15,
    downvotes: 38,
  },
];

export const autoBanLog: AutoBanItem[] = [
  {
    id: "6778",
    about:
      "Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966.",
    type: "Post",
    community: "c/rants",
    finalRatio: 27,
  },
  {
    id: "78",
    about:
      "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum.",
    type: "Comment",
    community: "c/devs",
    finalRatio: 34,
  },
  {
    id: "7855",
    about:
      "Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old.",
    type: "Post",
    community: "c/design",
    finalRatio: 25.4,
  },
  {
    id: "128",
    about:
      "There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour.",
    type: "Post",
    community: "c/webs",
    finalRatio: 27,
  },
];

export const reports: ReportItem[] = [
  {
    id: "6778",
    content: "Unpopular opinion about the new office parking policy",
    reason: "flagged: inflammatory content",
    community: "c/rants",
    reports: 2,
  },
  {
    id: "78",
    content: "Selling my old textbooks, DM offers",
    reason: "flagged: possible scam listing",
    community: "c/local-mm",
    reports: 4,
  },
  {
    id: "8778",
    content: "Comment on \"Is remote work actually dying?\"",
    reason: "flagged: off-topic spam",
    community: "c/dev-notes",
    reports: 3,
  },
  {
    id: "778",
    content: "Anyone else getting weird links in chat requests?",
    reason: "flagged: possible phishing",
    community: "c/quiet-thoughts",
    reports: 1,
  },
];
