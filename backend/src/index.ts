import {
  GoogleGenAI,
  Tool as GEMINI_TOOL,
  Type,
} from "@google/genai";
import readline from "readline/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import dotenv from "dotenv";
import { Tool as MCP_TOOL } from "@modelcontextprotocol/sdk/types";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set");
}

interface IPromptHistory {
  role: "user" | "model" | "function";
  parts: { text?: string; functionCall?: { name: string; args: any } }[];
}

class MCPClient {
  private mcp: Client;
  private googleGenAI: GoogleGenAI;
  private transport: StreamableHTTPClientTransport | null = null;
  private mcpTools: MCP_TOOL[] = [];
  private geminiTools: GEMINI_TOOL[] = [];
  private promptHistory: IPromptHistory[] = [];

  constructor() {
    this.googleGenAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    this.mcp = new Client({ name: "mcp-client", version: "1.0.0" });
  }

  async connectToServer(): Promise<void> {
    try {
      this.transport = new StreamableHTTPClientTransport(
        new URL("http://localhost:8000/mcp")
      );
      await this.mcp.connect(this.transport);
      console.log("Connected to MCP server");
    } catch (error: any) {
      throw new Error(`Failed to connect to server: ${error.message}`);
    }
  }

  // Helper function to sanitize JSON Schema for Gemini compatibility
  private sanitizeSchema(schema: any): any {
    if (!schema) return schema;

    const sanitized = { ...schema };

    // Remove unsupported fields
    delete sanitized.additionalProperties;
    delete sanitized.$schema;
    delete sanitized.definitions;

    // Recursively sanitize properties and items
    if (sanitized.properties) {
      sanitized.properties = Object.fromEntries(
        Object.entries(sanitized.properties).map(([key, value]) => [
          key,
          this.sanitizeSchema(value),
        ])
      );
    }

    if (sanitized.items) {
      sanitized.items = this.sanitizeSchema(sanitized.items);
    }

    return sanitized;
  }

  async chatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log("Type your queries or 'quit' to exit.");
      console.log("To create a tweet, start your message with '!tweet' followed by your tweet text.");
      console.log("To use other tools directly, start your message with '!tool' followed by the tool name and arguments.");
      console.log("Example: !tweet Hello world!");
      console.log("Example: !tool getUserProfile");
      this.mcpTools = (await this.mcp.listTools()).tools;
      console.log(
        "Available tools:",
        this.mcpTools.map((tool) => tool.name)
      );

      this.geminiTools = [
        {
          functionDeclarations: this.mcpTools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: this.sanitizeSchema({
              type: Type.OBJECT,
              properties: tool.inputSchema.properties,
              required: tool.inputSchema.required,
            }),
          })),
        },
      ];

      if (this.mcpTools.length === 0) {
        console.log("No tools available.");
        return;
      }

      while (true) {
        const message = await rl.question("\nQuery: ");
        if (message.toLowerCase() === "quit") {
          break;
        }

        // Handle tweet command
        if (message.startsWith("!tweet")) {
          const tweetText = message.slice(6).trim();
          if (!tweetText) {
            console.log("Please provide tweet text after !tweet command");
            continue;
          }
          try {
            const toolResponse = await this.mcp.callTool({
              name: "tweet",
              arguments: { tweet: tweetText },
            });
            console.log("Tweet Response:", toolResponse.content);
            continue;
          } catch (error: any) {
            console.log(`Error creating tweet: ${error.message}`);
            continue;
          }
        }

        // Handle other tool commands
        if (message.startsWith("!tool")) {
          const parts = message.slice(5).trim().split(" ");
          const toolName = parts[0];
          const argsString = parts.slice(1).join(" ");

          try {
            const toolArgs = JSON.parse(argsString);
            const tool = this.mcpTools.find((t) => t.name === toolName);
            
            if (!tool) {
              console.log(`Tool ${toolName} not found.`);
              continue;
            }

            console.log(`Calling tool directly: ${toolName}`);
            const toolResponse = await this.mcp.callTool({
              name: toolName,
              arguments: toolArgs,
            });

            const responseText = toolResponse.content && typeof toolResponse.content === 'object' && Array.isArray(toolResponse.content) ?
              toolResponse.content[0]?.text || JSON.stringify(toolResponse.content, null, 2) :
              JSON.stringify(toolResponse.content, null, 2);
            console.log("Tool Response:", responseText);
          } catch (error: any) {
            console.log(`Error in direct tool call: ${error.message}`);
          }
          continue;
        }

        // Regular chat interaction
        this.promptHistory.push({ role: "user", parts: [{ text: message }] });

        try {
          console.log("Sending request to Gemini...");
          const response = await this.googleGenAI.models.generateContent({
            model: GEMINI_MODEL,
            contents: this.promptHistory.map((entry) => ({
              role: entry.role === "function" ? "model" : entry.role,
              parts: entry.parts.map((part) =>
                part.functionCall
                  ? { functionCall: part.functionCall }
                  : { text: part.text! }
              ),
            })),
            config: {
              tools: this.geminiTools,
            },
          });

          if (!response.candidates?.length) {
            console.log("No response from Gemini.");
            continue;
          }

          const candidate = response.candidates[0];
          if (!candidate.content) {
            console.log("No content in Gemini response.");
            continue;
          }
          const parts = candidate.content.parts;

          if (!parts || !Array.isArray(parts)) {
            console.log("Invalid content format in Gemini response.");
            continue;
          }

          for (const part of parts) {
            if (part.text) {
              console.log("Gemini Response:", part.text);
              this.promptHistory.push({
                role: "model",
                parts: [{ text: part.text }],
              });
            }

            if (part.functionCall) {
              const { name: toolName, args: toolArgs } = part.functionCall;
              console.log(
                `Gemini requested tool: ${toolName} with args:`,
                toolArgs
              );

              this.promptHistory.push({
                role: "model",
                parts: [{ functionCall: { name: toolName!, args: toolArgs } }],
              });

              const tool = this.mcpTools.find((t) => t.name === toolName);
              if (!tool) {
                console.log(`Tool ${toolName} not found.`);
                this.promptHistory.push({
                  role: "model",
                  parts: [{ text: `Error: Tool ${toolName} not found.` }],
                });
                continue;
              }

              try {
                console.log(`Calling MCP tool: ${toolName}`);
                const toolResponse = await this.mcp.callTool({
                  name: toolName!,
                  arguments: toolArgs,
                });

                const responseText = toolResponse.content && typeof toolResponse.content === 'object' && Array.isArray(toolResponse.content) ?
                  toolResponse.content[0]?.text || JSON.stringify(toolResponse.content, null, 2) :
                  JSON.stringify(toolResponse.content, null, 2);
                console.log("Tool Response:", responseText);

                this.promptHistory.push({
                  role: "function",
                  parts: [{ text: responseText }],
                });
              } catch (error: any) {
                console.log(`Error calling tool ${toolName}: ${error.message}`);
                this.promptHistory.push({
                  role: "model",
                  parts: [
                    {
                      text: `Error calling tool ${toolName}: ${error.message}`,
                    },
                  ],
                });
              }
            }
          }
        } catch (error: any) {
          console.log(`Error processing query: ${error.message}`);
          this.promptHistory.push({
            role: "model",
            parts: [{ text: `Error: ${error.message}` }],
          });
        }

        // Limit prompt history to avoid excessive token usage
        if (this.promptHistory.length > 10) {
          this.promptHistory = this.promptHistory.slice(-10);
        }
      }
    } finally {
      rl.close();
    }
  }

  async cleanup() {
    try {
      await this.mcp.close();
      console.log("Disconnected from MCP server");
    } catch (error: any) {
      console.error(`Error during cleanup: ${error.message}`);
    }
  }
}

const main = async () => {
  const mcpClient = new MCPClient();
  try {
    await mcpClient.connectToServer();
    await mcpClient.chatLoop();
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await mcpClient.cleanup();
  }
};

main().catch(console.error);
