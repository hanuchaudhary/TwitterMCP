
# TwitterMCP - Twitter Integration with Model Context Protocol & Google Gemini

A full-stack application that combines the **Model Context Protocol (MCP)** with **Google Gemini AI** to interact with Twitter/X API. This project enables AI-powered Twitter operations through natural language commands.

## 🚀 Overview

TwitterMCP consists of two main components:

1. **MCP Server** (`mcp-server/`) - Exposes Twitter API operations as MCP tools via HTTP
2. **Backend Client** (`backend/`) - Connects to the MCP server and uses Google Gemini AI to interpret natural language queries and execute Twitter operations

## ✨ Features

- 🐦 **Tweet Creation** - Create tweets through natural language or direct commands
- 👤 **User Profile Management** - Fetch detailed user profiles with metrics and recent tweets
- 📝 **Timeline Retrieval** - Get recent tweets from your timeline
- 🗑️ **Tweet Deletion** - Delete specific tweets by ID
- 🤖 **AI-Powered Interactions** - Use Google Gemini to interpret natural language commands
- 💬 **Interactive CLI** - Chat-like interface for seamless Twitter operations

## 🏗️ Architecture

\`\`\`
┌─────────────┐      HTTP/MCP      ┌─────────────┐      Twitter API
│   Backend   │ ←──────────────→  │ MCP Server  │ ←─────────────→  X/Twitter
│   Client    │                    │             │
│  (Gemini)   │                    │             │
└─────────────┘                    └─────────────┘
\`\`\`

### MCP Server (Port 8000)
- Built with Express.js and TypeScript
- Implements MCP protocol via HTTP transport
- Provides Twitter API tools:
  - `tweet` - Create tweets
  - `getUserProfile` - Get user profile details
  - `getUserTweets` - Retrieve recent tweets
  - `deleteTweet` - Delete tweets
  - `currentTime` - Get server time

### Backend Client
- Connects to MCP server
- Uses Google Gemini AI for natural language understanding
- Function calling integration with MCP tools
- Interactive command-line interface
- Conversation history management

## 📋 Prerequisites

- Node.js (v16 or higher)
- pnpm (v10.10.0 or higher)
- Twitter/X Developer Account with API credentials
- Google Gemini API key

## 🔧 Installation

### 1. Clone the repository
\`\`\`bash
git clone <repository-url>
cd TwitterMCP
\`\`\`

### 2. Install dependencies

**MCP Server:**
\`\`\`bash
cd mcp-server
pnpm install
\`\`\`

**Backend Client:**
\`\`\`bash
cd backend
pnpm install
\`\`\`

## ⚙️ Configuration

### MCP Server Environment Variables

Create a `.env` file in the `mcp-server/` directory:

\`\`\`env
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret
\`\`\`

### Backend Client Environment Variables

Create a `.env` file in the `backend/` directory:

\`\`\`env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
\`\`\`

## 🚀 Running the Application

### 1. Start the MCP Server
\`\`\`bash
cd mcp-server
pnpm dev
\`\`\`
Server will run on `http://localhost:8000/mcp`

### 2. Start the Backend Client
\`\`\`bash
cd backend
pnpm build
\`\`\`

## 💡 Usage

### Interactive Mode

Once the backend client starts, you'll see available tools and can interact using:

**Direct Tweet Command:**
\`\`\`
Query: !tweet Hello, World! This is my first AI-powered tweet!
\`\`\`

**Natural Language (via Gemini):**
\`\`\`
Query: Can you get my Twitter profile?
Query: Show me my last 5 tweets
Query: Create a tweet saying "AI is amazing!"
\`\`\`

**Direct Tool Call:**
\`\`\`
Query: !tool getUserProfile {}
Query: !tool getUserTweets {"maxResults": 20}
Query: !tool deleteTweet {"tweetId": "1234567890"}
\`\`\`

### Available Commands

- `!tweet <text>` - Create a tweet directly
- `!tool <toolName> <jsonArgs>` - Call a tool directly with JSON arguments
- Natural language queries - Let Gemini interpret and execute
- `quit` - Exit the application

## 🛠️ Technology Stack

### MCP Server
- TypeScript
- Express.js
- twitter-api-v2
- @modelcontextprotocol/sdk
- Zod (schema validation)

### Backend Client
- TypeScript
- @google/genai (Google Gemini)
- @modelcontextprotocol/sdk
- Node.js readline

## 📁 Project Structure

\`\`\`
TwitterMCP/
├── backend/
│   ├── src/
│   │   └── index.ts           # Backend client with Gemini integration
│   ├── package.json
│   └── tsconfig.json
├── mcp-server/
│   ├── src/
│   │   ├── index.ts           # MCP server implementation
│   │   └── twitter-config.ts  # Twitter API service layer
│   ├── package.json
│   └── tsconfig.json
└── README.md
\`\`\`

## 🔐 Security Notes

- Never commit `.env` files to version control
- Keep your API keys secure
- Use environment variables for sensitive data
- Consider rate limits for Twitter API
- Review Twitter's API usage policies

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

ISC

## 👤 Author

Created by [hanuchaudhary](https://github.com/hanuchaudhary)

## 🐛 Troubleshooting

### Connection Issues
- Ensure MCP server is running before starting the backend client
- Verify the server is accessible at `http://localhost:8000/mcp`

### Twitter API Errors
- Check that all Twitter credentials are correctly set
- Verify your Twitter app has the necessary permissions
- Check rate limits in Twitter Developer Portal

### Gemini API Issues
- Ensure GEMINI_API_KEY is valid
- Check your API quota in Google AI Studio
- Verify the model name is correct

## 🔗 Useful Links

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Twitter API v2 Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [Google Gemini Documentation](https://ai.google.dev/)

---

Made with ❤️ using MCP, Gemini AI, and Twitter API