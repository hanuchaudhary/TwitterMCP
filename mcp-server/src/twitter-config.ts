import dotenv from "dotenv";
import { TwitterApi } from "twitter-api-v2";
dotenv.config();

// Twitter API Client Setup
const requiredEnvVars = [
  "TWITTER_API_KEY",
  "TWITTER_API_SECRET",
  "TWITTER_ACCESS_TOKEN",
  "TWITTER_ACCESS_TOKEN_SECRET",
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`${envVar} is not set`);
  }
});

export class TwitterService {
  private client: TwitterApi;
  private userId: string | null = null;

  constructor() {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY || "consumerAppKey",
      appSecret: process.env.TWITTER_API_SECRET || "consumerAppSecret",
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
  }

  private async getUserId(): Promise<string> {
    if (!this.userId) {
      const currentUser = await this.client.currentUserV2();
      this.userId = currentUser.data.id;
    }
    return this.userId;
  }

  async createTweet(tweet: string) {
    try {
      const response = await this.client.v2.tweet(tweet);
      console.log("Tweet created successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error creating tweet:", error);
      throw new Error("Failed to create tweet");
    }
  }

  async getUserProfile() {
    try {
      const userId = await this.getUserId();

      // Fetch detailed user data
      const user = await this.client.v2.user(userId, {
        "user.fields": [
          "id",
          "name",
          "username",
          "description",
          "public_metrics",
          "profile_image_url",
          "verified",
          "created_at",
          "location",
          "url",
          "protected",
          "pinned_tweet_id",
          "entities",
          "withheld"
        ]
      });

      // Fetch user's recent tweets
      const recentTweets = await this.client.v2.userTimeline(userId, {
        max_results: 5,
        "tweet.fields": [
          "created_at",
          "public_metrics",
          "entities",
          "context_annotations",
          "attachments"
        ]
      });

      // Compile comprehensive user data
      const userData = {
        id: user.data.id,
        name: user.data.name,
        username: user.data.username,
        description: user.data.description || "",
        location: user.data.location || "",
        url: user.data.url || "",
        verified: user.data.verified || false,
        protected: user.data.protected || false,
        created_at: user.data.created_at,
        profile_image_url: user.data.profile_image_url,
        metrics: {
          followers_count: user.data.public_metrics?.followers_count || 0,
          following_count: user.data.public_metrics?.following_count || 0,
          tweet_count: user.data.public_metrics?.tweet_count || 0,
          listed_count: user.data.public_metrics?.listed_count || 0
        },
        recent_tweets: recentTweets.data.data?.map(tweet => ({
          id: tweet.id,
          text: tweet.text,
          created_at: tweet.created_at,
          metrics: tweet.public_metrics,
          entities: tweet.entities
        })) || [],
        pinned_tweet_id: user.data.pinned_tweet_id,
        entities: user.data.entities,
        withheld: user.data.withheld
      };

      console.log("User profile fetched successfully:", userData);
      return userData;
    } catch (error: any) {
      console.error("Error fetching user profile:", error);
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
  }

  async getUserTweets(maxResults: number = 10) {
    try {
      const userId = await this.getUserId();
      const tweets = await this.client.v2.userTimeline(userId, { max_results: maxResults });
      return tweets.data.data.map((tweet: any) => ({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
      }));
    } catch (error) {
      console.error("Error fetching user tweets:", error);
      throw new Error("Failed to fetch user tweets");
    }
  }

  async deleteTweet(tweetId: string) {
    try {
      const response = await this.client.v2.deleteTweet(tweetId);
      return response.data;
    } catch (error) {
      console.error("Error deleting tweet:", error);
      throw new Error("Failed to delete tweet");
    }
  }

  async scheduleTweets(tweets: { text: string; scheduleTime: string }[]) {
    try {
      const results = [];
      for (const tweet of tweets) {
        const scheduledTime = new Date(tweet.scheduleTime);
        if (scheduledTime <= new Date()) {
          throw new Error("Scheduled time must be in the future");
        }
        // Note: Twitter API v2 does not natively support scheduling; this is a placeholder
        // Simulate scheduling by delaying tweet creation
        const delay = scheduledTime.getTime() - Date.now();
        setTimeout(async () => {
          const response = await this.createTweet(tweet.text);
          console.log(`Scheduled tweet created at ${scheduledTime}:`, response);
        }, delay);
        results.push({ text: tweet.text, scheduledTime: tweet.scheduleTime });
      }
      return results;
    } catch (error) {
      console.error("Error scheduling tweets:", error);
      throw new Error("Failed to schedule tweets");
    }
  }
}

// Create and export a singleton instance
export const twitterService = new TwitterService();

// Export individual functions for backward compatibility
export const createTweet = (tweet: string) => twitterService.createTweet(tweet);
export const getUserProfile = () => twitterService.getUserProfile();
export const getUserTweets = (maxResults: number = 10) => twitterService.getUserTweets(maxResults);
export const deleteTweet = (tweetId: string) => twitterService.deleteTweet(tweetId);
export const scheduleTweets = (tweets: { text: string; scheduleTime: string }[]) =>
  twitterService.scheduleTweets(tweets);
