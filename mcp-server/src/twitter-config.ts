import dotenv from "dotenv";
import { TwitterApi } from "twitter-api-v2";
dotenv.config();

// Check if the required environment variables are set
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

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY || "consumerAppKey",
  appSecret: process.env.TWITTER_API_SECRET || "consumerAppSecret",
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

export const createTweet = async (tweet: string) => {
  try {
    const response = await twitterClient.v2.tweet(tweet);
    console.log("Tweet created successfully:", response);
    return tweet;
  } catch (error) {
    console.error("Error creating tweet:", error);
    throw new Error("Failed to create tweet");
  }
};
