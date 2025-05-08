import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  createTweet,
  deleteTweet,
  getUserProfile,
  getUserTweets,
  scheduleTweets
} from "./twitter-config";

const app = express();
app.use(express.json());

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Handle POST requests for client-to-server communication
app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports[sessionId] = transport;
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };
    const server = new McpServer({
      name: "example-server",
      version: "1.0.0",
    });

    server.tool(
      "tweet",
      "create a tweet",
      {
        tweet: z.string().min(1).max(280),
      },
      async (args) => {
        const tweet = await createTweet(args.tweet);
        return {
          content: [
            {
              type: "text",
              text: `Tweet created successfully: ${tweet.text}`,
            },
          ],
        };
      }
    );

    server.tool(
      "currentTime",
      "returns the current server time",
      {},
      async () => ({
        content: [
          {
            type: "text",
            text: `The current server time is ${new Date().toLocaleString()}`,
          },
        ],
      })
    );

    server.tool(
      "getUserProfile",
      "retrieve a Twitter user's profile",
      async () => {
        const profile = await getUserProfile();
        return {
          content: [
            {
              type: "text",
              text: `User Profile: ${JSON.stringify(profile, null, 2)}`,
            },
          ],
        };
      }
    );

    server.tool(
      "getUserTweets",
      "retrieve a user's recent tweets",
      {
        maxResults: z.number().int().min(5).max(100).optional().default(10),
      },
      async (args) => {
        const tweets = await getUserTweets(args.maxResults);
        return {
          content: [
            {
              type: "text",
              text: `Recent Tweets: ${JSON.stringify(tweets, null, 2)}`,
            },
          ],
        };
      }
    );

    server.tool(
      "deleteTweet",
      "delete a specific tweet by ID",
      {
        tweetId: z.string().min(1),
      },
      async (args) => {
        const result = await deleteTweet(args.tweetId);
        return {
          content: [
            {
              type: "text",
              text: `Tweet deleted successfully: ${JSON.stringify(result)}`,
            },
          ],
        };
      }
    );

    server.tool(
      "scheduleTweets",
      "schedule multiple tweets for future posting",
      {
        tweets: z
          .array(
            z.object({
              text: z.string().min(1).max(280),
              scheduleTime: z
                .string()
                .refine((val) => !isNaN(Date.parse(val)), {
                  message: "Invalid date format",
                }),
            })
          )
          .min(1),
      },
      async (args) => {
        const results = await scheduleTweets(args.tweets);
        return {
          content: [
            {
              type: "text",
              text: `Tweets scheduled successfully: ${JSON.stringify(
                results,
                null,
                2
              )}`,
            },
          ],
        };
      }
    );

    // Connect to the MCP server
    await server.connect(transport);
  } else {
    // Invalid request
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad Request: No valid session ID provided",
      },
      id: null,
    });
    return;
  }

  // Handle the request
  await transport.handleRequest(req, res, req.body);
});

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (
  req: express.Request,
  res: express.Response
) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// Handle GET requests for server-to-client notifications via SSE
app.get("/mcp", handleSessionRequest);

// Handle DELETE requests for session termination
app.delete("/mcp", handleSessionRequest);

app.listen(8000, () => {
  console.log("Server is running on http://localhost:8000/mcp");
});
