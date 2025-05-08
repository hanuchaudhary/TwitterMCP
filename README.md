# TweetCraft Chat

A web-based chat application that allows users to generate social media posts via a conversational interface with an LLM, using the Model Context Protocol (MCP).

## Project Overview

TweetCraft Chat helps content creators, companies, and developers increase platform reach, market products, and streamline workflows through continuous posting. The application features a WhatsApp-style chat interface where users can interact with an LLM to generate social media posts.

### Key Features

- Conversational UI for generating social media posts
- Multiple post generation with scheduling
- Support for different tones (savage, funny, inspirational, informative)
- Mock scheduling system (in-memory)
- Accessibility features and modern UI design

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express
- Protocol: Model Context Protocol (MCP)
- UI: Custom CSS with animations

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tweetcraft-chat.git
cd tweetcraft-chat
```

2. Install dependencies:
```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Create a `.env` file in the server directory:
```
PORT=3001
MCP_SERVER_URL=http://localhost:3001
```

### Running the Application

1. Start the server:
```bash
cd server
npm run dev
```

2. Start the client:
```bash
cd client
npm run dev
```

3. Open http://localhost:5173 in your browser

## Demo Video Script

### Introduction (30 seconds)
- Show the TweetCraft Chat interface
- Explain the purpose: helping content creators generate and schedule social media posts
- Highlight the conversational UI and accessibility features

### Basic Post Generation (45 seconds)
- Type: "Create a funny post about AI"
- Show the AI response with a generated post
- Demonstrate the tone selection and post preview

### Multiple Post Scheduling (45 seconds)
- Type: "Generate 10 posts about LLMs in 10 hours"
- Show the scheduling interface with mock timestamps
- Explain how the posts are distributed across the time period

### Conclusion (30 seconds)
- Show the accessibility features (keyboard navigation, high contrast)
- Mention future improvements (BullMQ/Redis integration)
- Call to action for the Empire UI Track

## Empire UI Track Alignment

### AI-Powered React Component
- Chat interface powered by MCP for dynamic content generation
- Real-time feedback and loading states
- Accessible design with ARIA labels

### Unique UX
- Conversational interface with message animations
- Keyboard navigation support
- High contrast mode
- Real-time feedback for user actions

## Future Improvements

- Integration with BullMQ/Redis for robust scheduling
- Real X API integration
- Analytics dashboard
- Custom post templates
- Multi-platform support

## License

MIT License 