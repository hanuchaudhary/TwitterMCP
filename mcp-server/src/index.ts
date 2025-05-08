import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createTweet } from "./twitter-config";



const app = express();
app.use(express.json());

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Handle POST requests for client-to-server communication
app.post("/mcp", async (req, res) => {
  // Check for existing session ID
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Store the transport by session ID
        transports[sessionId] = transport;
      },
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };
    const server = new McpServer({
      name: "example-server",
      version: "1.0.0",
    });

    // ... set up server resources, tools, and prompts ...
    server.tool(
      "sum",
      "sum of two numbers",
      {
        a: z.number(),
        b: z.number(),
      },
      async (args) => ({
        content: [
          {
            type: "text",
            text: `The sum of ${args.a} and ${args.b} is ${args.a + args.b}`,
          },
        ],
      })
    );

    server.tool(
      "tweet",
      "create a tweet",
      {
        tweet: z.string(),
      },
      async (args) => {
        await createTweet(args.tweet);
        
        console.log(`Tweet created: ${args.tweet}`);
        return {
          content: [
            {
              type: "text",
              text: `Tweet created successfully: ${args.tweet}`,
            },
          ],
        };
      }
    );

    server.tool(
      "greet",
      "generate a greeting message",
      {
        name: z.string(),
      },
      async (args) => ({
        content: [
          {
            type: "text",
            text: `Hello, ${args.name}! 👋 Hope you're having a great day!`,
          },
        ],
      })
    );

    server.tool(
      "multiply",
      "multiply two numbers",
      {
        a: z.number(),
        b: z.number(),
      },
      async (args) => ({
        content: [
          {
            type: "text",
            text: `${args.a} multiplied by ${args.b} is ${args.a * args.b}`,
          },
        ],
      })
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
