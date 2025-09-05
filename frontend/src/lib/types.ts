import { ParamValue } from "next/dist/server/request/params";

export interface BiasScore {
  score: number;
  confidence: number;
  label: string;
}

export interface SignalResult {
  signalType: string;
  score: BiasScore;
  summary: string;
  examples: string[];
}

export interface RedditPost {
  title: string;
  url: string;
  permalink: string;
  author: string;
  score: number;
}

export interface MBFCDetail {
  url: string;
  bias?: string;
  country?: string;
  credibility?: string;
  factual_reporting?: string;
  id?: number;
  mbfc_url?: string;
  media_type?: string;
  source_id?: number;
  source_name?: string;
  source_url?: string;
  created_at?: string;
}

export type RedditSignal = {
  url: string;
  // MBFCDetail fields
  bias?: string;
  country?: string;
  credibility?: string;
  factual_reporting?: string;
  id?: number;
  mbfc_url?: string;
  media_type?: string;
  source_id?: number;
  source_name?: string;
  source_url?: string;
  created_at?: string;
  // RedditPost fields
  title?: string;
  permalink?: string;
  author?: string;
  score?: number;
}

export interface AnalysisResult {
  communityName?: string;
  platform?: string;
  overallScore?: BiasScore;
  signalResults?: SignalResult[];
  analysisDate?: string;
  redditPosts?: RedditPost[];
  message?: string;
  biasBreakdown?: Record<string, number>;
  details?: MBFCDetail[];
  totalPosts?: number;
  urlsChecked?: number;
  discussionSignal?: {
    samples: Array<{
      title: string;
      url: string;
      permalink: string;
      bias: string;
      sentiment: 'positive' | 'negative' | 'neutral';
      engagement: number;
      sampleComments: string[];
        aiMeta?: {
          provider: string;
          sentiment?: string;
          score?: number;
          reasoning?: string;
          model?: string;
          cached?: boolean;
          error?: boolean;
        } | null;
    }>;
    leanRaw: number;           // -5..5 raw score
    leanNormalized: number;    // 0..10 normalized
    label: string;             // label bucket
  };
}

export interface SubredditResultsProps {
  subreddit: ParamValue;
  result: AnalysisResult | null;
  error: string | null;
  isLoading: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Reddit {
  // Root response for a Reddit post + comments
  export type APIResponse = [PostListing, CommentListing];

  // Generic listing wrapper
  export interface Listing<T> {
    kind: "Listing";
    data: {
      after: string | null;
      before: string | null;
      dist?: number | null;
      modhash: string;
      geo_filter?: string;
      children: T[];
    };
  }

  // Post listing = one post
  export type PostListing = Listing<Post>;

  // Comment listing = all root comments
  export type CommentListing = Listing<Comment>;

  // ======================
  // Thing kinds
  // ======================

  // Post (kind: t3)
  export interface Post {
    kind: "t3";
    data: PostData;
  }

  export interface PostData {
    approved_at_utc: number | null;
    subreddit: string;
    selftext: string;
    author_fullname: string;
    saved: boolean;
    mod_reason_title: string | null;
    gilded: number;
    clicked: boolean;
    title: string;
    link_flair_richtext: FlairRichText[];
    subreddit_name_prefixed: string;
    hidden: boolean;
    pwls: number | null;
    link_flair_css_class: string | null;
    downs: number;
    thumbnail_height: number | null;
    top_awarded_type: string | null;
    hide_score: boolean;
    name: string;
    quarantine: boolean;
    link_flair_text_color: string;
    upvote_ratio: number;
    author_flair_background_color: string | null;
    subreddit_type: string;
    ups: number;
    total_awards_received: number;
    media_embed: Record<string, unknown>;
    thumbnail_width: number | null;
    author_flair_template_id: string | null;
    is_original_content: boolean;
  user_reports: unknown[];
    secure_media: object | null;
    is_reddit_media_domain: boolean;
    is_meta: boolean;
    category: string | null;
    secure_media_embed: Record<string, unknown>;
    link_flair_text: string | null;
    can_mod_post: boolean;
    score: number;
    approved_by: string | null;
    is_created_from_ads_ui: boolean;
    author_premium: boolean;
    thumbnail: string;
    edited: boolean | number;
    author_flair_css_class: string | null;
  steward_reports: unknown[];
    author_flair_richtext: FlairRichText[];
    gildings: Gildings;
    content_categories: string[] | null;
    is_self: boolean;
    mod_note: string | null;
    created: number;
    link_flair_type: string;
    wls: number | null;
    removed_by_category: string | null;
    banned_by: string | null;
    author_flair_type: string;
    domain: string;
    allow_live_comments: boolean;
    selftext_html: string | null;
    likes: boolean | null;
    suggested_sort: string | null;
    banned_at_utc: number | null;
    view_count: number | null;
    archived: boolean;
    no_follow: boolean;
    is_crosspostable: boolean;
    pinned: boolean;
    over_18: boolean;
    preview?: object;
    all_awardings: Award[];
    awarders: string[];
    media_only: boolean;
    can_gild: boolean;
    spoiler: boolean;
    locked: boolean;
    author_flair_text: string | null;
    treatment_tags: string[];
    visited: boolean;
    removed_by: string | null;
    num_reports: number | null;
    distinguished: string | null;
    subreddit_id: string;
    author_is_blocked: boolean;
    mod_reason_by: string | null;
    removal_reason: string | null;
    link_flair_background_color: string;
    id: string;
    is_robot_indexable: boolean;
  report_reasons: string[] | null;
    author: string;
    discussion_type: string | null;
    num_comments: number;
    send_replies: boolean;
    whitelist_status: string | null;
    contest_mode: boolean;
  mod_reports: string[];
    author_patreon_flair: boolean;
    author_flair_text_color: string | null;
    permalink: string;
    parent_whitelist_status: string | null;
    stickied: boolean;
    url: string;
    subreddit_subscribers: number;
    created_utc: number;
    num_crossposts: number;
    media: object | null;
    is_video: boolean;
  }

  // Comment (kind: t1)
  export interface Comment {
    kind: "t1";
    data: CommentData;
  }

  export interface CommentData {
    all_awardings: Award[];
    approved_at_utc: number | null;
    approved_by: string | null;
    archived: boolean;
    associated_award: string | null;
    author: string;
    author_flair_background_color: string | null;
    author_flair_css_class: string | null;
    author_flair_richtext: FlairRichText[];
    author_flair_template_id: string | null;
    author_flair_text: string | null;
    author_flair_text_color: string | null;
    author_flair_type: string;
    author_fullname: string;
    author_is_blocked: boolean;
    author_patreon_flair: boolean;
    author_premium: boolean;
    awarders: string[];
    banned_at_utc: number | null;
    banned_by: string | null;
    body: string;
    body_html: string;
    can_gild: boolean;
    can_mod_post: boolean;
    collapsed: boolean;
    collapsed_because_crowd_control: boolean | null;
    collapsed_reason: string | null;
    collapsed_reason_code: string | null;
    comment_type: string | null;
    controversiality: number;
    created: number;
    created_utc: number;
    depth: number;
    distinguished: string | null;
    downs: number;
    edited: boolean | number;
    gilded: number;
    gildings: Gildings;
    id: string;
    is_submitter: boolean;
    likes: boolean | null;
    link_id: string;
    locked: boolean;
    mod_note: string | null;
    mod_reason_by: string | null;
    mod_reason_title: string | null;
    mod_reports: string[];
    name: string;
    no_follow: boolean;
    num_reports: number | null;
    parent_id: string;
    permalink: string;
    removal_reason: string | null;
    removed: boolean;
    removed_by: string | null;
    removed_by_category: string | null;
    report_reasons: string[] | null;
    replies: "" | Listing<Comment>;
    saved: boolean;
    score: number;
    score_hidden: boolean;
    send_replies: boolean;
    stickied: boolean;
    steward_reports: unknown[];
    subreddit: string;
    subreddit_id: string;
    subreddit_name_prefixed: string;
    subreddit_type: string;
    total_awards_received: number;
    treatment_tags: string[];
    ups: number;
    user_reports: unknown[];
  }

  // Account (kind: t2)
  export interface Account {
    kind: "t2";
    data: {
      id: string;
      name: string;
      created: number;
      created_utc: number;
      link_karma: number;
      comment_karma: number;
      is_employee: boolean;
      is_mod: boolean;
      is_gold: boolean;
      has_verified_email: boolean;
      icon_img: string;
    };
  }

  // Message (kind: t4)
  export interface Message {
    kind: "t4";
    data: {
      id: string;
      body: string;
      body_html: string;
      author: string;
      dest: string;
      created: number;
      created_utc: number;
      was_comment: boolean;
      subject: string;
      parent_id: string | null;
      new: boolean;
      distinguished: string | null;
    };
  }

  // Subreddit (kind: t5)
  export interface Subreddit {
    kind: "t5";
    data: {
      id: string;
      name: string;
      display_name: string;
      title: string;
      url: string;
      subscribers: number;
      over18: boolean;
      description: string;
      public_description: string;
      created: number;
      created_utc: number;
      user_is_subscriber: boolean;
      community_icon: string;
      banner_img: string;
      icon_img: string;
    };
  }

  // Award (kind: t6)
  export interface AwardKind {
    kind: "t6";
    data: Award;
  }

  // More (kind: more)
  export interface MoreComments {
    kind: "more";
    data: {
      count: number;
      parent_id: string;
      id: string;
      name: string;
      children: string[];
      depth: number;
    };
  }

  // Union of all kinds
  export type Thing =
    | Comment
    | Post
    | Account
    | Message
    | Subreddit
    | AwardKind
    | MoreComments;

  // Awarding structure
  export interface Award {
    giver_coin_reward?: number;
    subreddit_id?: string | null;
    is_new?: boolean;
    days_of_premium?: number;
    icon_url: string;
    icon_height?: number;
    icon_width?: number;
    count: number;
    name: string;
    resized_icons?: { url: string; width: number; height: number }[];
  }

  // Flair richtext object
  export interface FlairRichText {
    e: "text" | "emoji";
    t?: string;
    u?: string;
  }

  // Gildings (award summary)
  export interface Gildings {
    gid_1?: number;
    gid_2?: number;
    gid_3?: number;
  }
}
