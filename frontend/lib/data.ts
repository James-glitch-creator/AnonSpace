export type Community = {
  slug: string;
  name: string;
  members: string;
  color: string;
};

export type Post = {
  id: string;
  handle: string;
  community: string;
  time: string;
  body: string;
  upvotes: number;
  downvotes: number;
  comments: number;
};

export const communities: Community[] = [
  { slug: "anondev", name: "AnonDev", members: "6.34M members", color: "bg-cyan-500" },
  { slug: "cyberprivacy", name: "CyberPrivacy", members: "2.1M members", color: "bg-fuchsia-500" },
  { slug: "design", name: "Design", members: "1.8M members", color: "bg-emerald-500" },
  { slug: "colortone", name: "ColorTone", members: "845K members", color: "bg-amber-500" },
];

export const trendingCommunities: Community[] = [
  { slug: "apple", name: "Apple", members: "5,145,343 members", color: "bg-slate-400" },
  { slug: "android", name: "Android", members: "4,545,343 members", color: "bg-lime-500" },
  { slug: "figma", name: "Figma", members: "12,545,343 members", color: "bg-purple-500" },
  { slug: "anondev", name: "AnonDev", members: "656,345,343 members", color: "bg-cyan-500" },
];

export const posts: Post[] = [
  {
    id: "p1",
    handle: "Anonymous #4531",
    community: "c/AnonDev",
    time: "2m ago",
    body: "Researchers at a leading university have published findings showing their latest language model scored in the 94th percentile on the Uniform Bar Examination, using only general-purpose pretraining.",
    upvotes: 2200,
    downvotes: 140,
    comments: 312,
  },
  {
    id: "p2",
    handle: "Anonymous #8892",
    community: "c/CyberPrivacy",
    time: "59m ago",
    body: "PSA: rotate any password you've reused across more than one site. Breach lists get recombined constantly and credential-stuffing bots don't sleep.",
    upvotes: 1840,
    downvotes: 95,
    comments: 128,
  },
  {
    id: "p3",
    handle: "Anonymous #2365",
    community: "c/Design",
    time: "3h ago",
    body: "Shipped a full rebrand this week without a single meeting going over time. Async design reviews are underrated.",
    upvotes: 963,
    downvotes: 41,
    comments: 76,
  },
  {
    id: "p4",
    handle: "Anonymous #9935",
    community: "c/ColorTone",
    time: "6h ago",
    body: "Muted cyan on near-black navy is quietly becoming the default \"trustworthy tech\" palette. Curious what's driving the shift.",
    upvotes: 511,
    downvotes: 28,
    comments: 33,
  },
];

export const chatThreads = [
  { id: "t1", handle: "Anonymous #4531", lastMessage: "did you see the r/AnonDev thread on the bar exam?", time: "2m" },
  { id: "t2", handle: "Anonymous #3221", lastMessage: "yeah, 94th percentile with general-only pretraining", time: "3h" },
  { id: "t3", handle: "Anonymous #6598", lastMessage: "Thanks! I'll check the notes tonight.", time: "1d" },
];
