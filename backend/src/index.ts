import { GoogleGenAI, Tool as GEMINI_TOOL, Type, GenerateContentResponse } from "@google/genai";
import readline from "readline/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import dotenv from "dotenv";
import { Tool as MCP_TOOL } from "@modelcontextprotocol/sdk/types";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set");
}

interface IPromptHistory {
  role: "user" | "model";
  parts: { text: string }[];
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
  async chatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log("Type your queries or 'quit' to exit.");
      this.mcpTools = (await this.mcp.listTools()).tools;

      this.geminiTools = [
        {
          //@ts-ignore
          functionDeclarations: this.mcpTools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: {
              type: Type.OBJECT,
              properties: tool.inputSchema.properties,
              required: tool.inputSchema.required,
            },
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

        this.promptHistory.push({ role: "user", parts: [{ text: message }] });
        try {
          console.log("Sending request to MCP server...");
          const response = await this.googleGenAI.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [...this.promptHistory],
            config: {
              tools: this.geminiTools,
            },
          });

          if (response.candidates?.length! > 0) {
            // @ts-ignore
            const textResponse = response?.candidates[0]?.content.parts[0].text
            // @ts-ignore
            const functionCallResponse = response.candidates[0].content.parts[0].functionCall;
            console.log("Response:", textResponse);
            console.log("Function call response:", functionCallResponse);

            if (functionCallResponse) {
              const toolName = functionCallResponse.name;
              const toolArgs = functionCallResponse.args;
              const tool = this.mcpTools.find((tool) => tool.name === toolName);

              if (tool) {
                console.log(`Calling tool: ${toolName} with args:`, toolArgs);
                const toolResponse = await this.mcp.callTool({
                  name: toolName!,
                  arguments: toolArgs,
                })

                this.promptHistory.push({
                  role: "model",
                  parts: [
                    {
                      // @ts-ignore
                      text: `Tool ${toolName} response: ${toolResponse.content[0].text}`,
                    },
                  ]
                });

                // @ts-ignore
                console.log("Tool response:", toolResponse.content[0].text);
              } else {
                console.log(`Tool ${toolName} not found.`);
              }
            }
          }
        } catch (error) {
          console.log(`Error: ${error}`);
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
