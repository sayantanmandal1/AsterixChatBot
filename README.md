<h1 align="center">Asterix AI Chatbot</h1>

<p align="center">
    A privacy-focused AI chatbot running entirely on your local machine with Ollama models, PostgreSQL, and Redis.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
  <a href="#running-locally"><strong>Running Locally</strong></a> ·
  <a href="#configuration"><strong>Configuration</strong></a>
</p>
<br/>

## Features

- **100% Local & Private** - All AI processing happens on your machine via Ollama
- **Modern UI** - Built with Next.js 15, React 19, and shadcn/ui components
- **Real-time Chat** - Streaming responses with the AI SDK
- **Code Artifacts** - Generate and edit code with syntax highlighting
- **Document Editing** - Create and modify documents with rich text editing
- **Chat History** - Persistent conversations stored in PostgreSQL
- **Authentication** - Secure user sessions with Auth.js
- **File Uploads** - Local file storage for images and attachments
- **Resumable Streams** - Continue interrupted conversations with Redis

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TailwindCSS, shadcn/ui
- **AI**: Ollama (Qwen 2.5 14B models), AI SDK
- **Database**: PostgreSQL (Docker), Drizzle ORM
- **Cache**: Redis (Docker)
- **Auth**: Auth.js (NextAuth v5)
- **Code Quality**: Ultracite (Biome), TypeScript

## AI Models

This application uses local Ollama models:

- **qwen2.5:14b** - Main chat model for conversations and reasoning
- **qwen2.5-coder:14b** - Specialized model for code generation and artifacts

You can easily swap these models by editing `lib/ai/providers.ts` to use any Ollama model you have installed.

## Running Locally

### Prerequisites

1. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop)
2. **Ollama** - [Download here](https://ollama.ai)
3. **Node.js 18+** and **pnpm**

### Installation

1. **Clone the repository**:
```bash
git clone <your-repo-url>
cd chatbotnext
```

2. **Start Docker services**:
```bash
docker compose up -d
```

This starts PostgreSQL and Redis containers.

3. **Install Ollama models**:
```bash
ollama pull qwen2.5:14b
ollama pull qwen2.5-coder:14b
```

Verify models are installed:
```bash
ollama list
```

4. **Install dependencies**:
```bash
pnpm install
```

5. **Run database migrations**:
```bash
pnpm db:migrate
```

6. **Start the development server**:
```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Stopping Services

Stop Docker containers:
```bash
docker compose down
```

To remove all data:
```bash
docker compose down -v
```

## Configuration

Environment variables in `.env.local`:

```env
# Session encryption (change in production)
AUTH_SECRET=your-secret-key-here

# Ollama API endpoint
OLLAMA_BASE_URL=http://localhost:11434

# PostgreSQL connection
POSTGRES_URL=postgresql://chatbot:chatbot_dev_password@localhost:5432/chatbot

# Redis connection
REDIS_URL=redis://localhost:6379
```

## Available Scripts

- `pnpm dev` - Start development server with Turbo
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Check code with Ultracite
- `pnpm format` - Format code with Ultracite
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Drizzle Studio (database GUI)
- `pnpm test` - Run Playwright tests

## Troubleshooting

### Ollama Connection Issues

Check if Ollama is running:
```bash
curl http://localhost:11434/api/tags
```

### Database Connection Issues

Check PostgreSQL logs:
```bash
docker compose logs postgres
```

### Redis Connection Issues

Check Redis logs:
```bash
docker compose logs redis
```

## License

MIT
