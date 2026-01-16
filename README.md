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
- **Credit System** - Usage-based credit management with subscription plans
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
- `pnpm db:seed` - Seed subscription plans
- `pnpm test` - Run Playwright tests

## Credit System

The application includes a comprehensive credit-based usage system that tracks and manages user consumption.

### How Credits Work

Credits are consumed based on the length of AI-generated responses:

**Credit Calculation Formula**: `credits = (character_count / 20)` rounded to 2 decimal places

**Example**:
- A 100-character response costs 5.00 credits
- A 500-character response costs 25.00 credits
- A 1000-character response costs 50.00 credits

### User Types and Credit Allocation

#### Guest Users
- **Initial Credits**: 200 credits upon first visit
- **Persistence**: Credits persist during browser session
- **Limitations**: Cannot purchase additional credits (must register)
- **Exhaustion**: Redirected to login page when credits run out

#### New Registered Users
- **Welcome Bonus**: 1000 credits upon registration
- **One-time**: Bonus is only granted once per account
- **Immediate**: Credits available immediately after registration

#### Authenticated Users
- **Monthly Allowance**: 200 credits automatically added each month
- **Automatic**: No action required, processed by cron job
- **Additive**: Monthly credits add to existing balance
- **Purchase**: Can buy additional credits via subscription plans

### Subscription Plans

Three subscription tiers are available for purchasing credits:

| Plan | Credits | Price | Best For |
|------|---------|-------|----------|
| **Starter** | 500 | $5.00 | Light usage, occasional conversations |
| **Pro** | 2000 | $15.00 | Regular usage, daily conversations |
| **Premium** | 5000 | $30.00 | Heavy usage, extensive conversations |

**Note**: This is a mock payment system for demonstration purposes.

### Credit Management

#### Viewing Your Balance
- **Navigation Bar**: Current balance displayed in the header
- **Account Profile**: Detailed balance and transaction history at `/profile`
- **Real-time Updates**: Balance updates immediately after each message

#### Credit Consumption Display
- Each AI response shows the exact credits consumed
- Credit meter updates in real-time during conversations
- Low balance warning appears when credits drop below 50

#### Purchasing Credits
1. Navigate to `/payments` (authenticated users only)
2. Select a subscription plan
3. Confirm purchase in the modal
4. Credits are added immediately to your account

#### Transaction History
View complete credit history in your account profile:
- Credit deductions (message generation)
- Credit additions (purchases, bonuses, monthly allowances)
- Timestamps and descriptions for all transactions
- Current balance after each transaction

### API Endpoints

#### Credit Operations

**GET** `/api/credits/balance`
- Returns current credit balance
- Authentication: Optional (returns guest balance if unauthenticated)
- Response: `{ balance: number, lastMonthlyAllocation: string | null }`

**POST** `/api/credits/deduct`
- Deducts credits after message generation
- Authentication: Required
- Body: `{ amount: number, description: string, metadata?: object }`
- Response: `{ success: boolean, newBalance: number, transaction: CreditTransaction }`

**GET** `/api/credits/transactions`
- Returns credit transaction history
- Authentication: Required
- Query params: `limit` (default: 50), `offset` (default: 0)
- Response: `{ transactions: CreditTransaction[], total: number }`

#### Payment Operations

**GET** `/api/payments/plans`
- Returns available subscription plans
- Authentication: Not required
- Response: `{ plans: SubscriptionPlan[] }`

**POST** `/api/payments/purchase`
- Processes a plan purchase (mock payment)
- Authentication: Required
- Body: `{ planId: string }`
- Response: `{ success: boolean, purchase: UserPurchase, newBalance: number }`

**GET** `/api/payments/history`
- Returns purchase history
- Authentication: Required
- Query params: `limit` (default: 50), `offset` (default: 0)
- Response: `{ purchases: UserPurchase[], total: number }`

#### User Profile

**GET** `/api/user/profile`
- Returns user profile with credit information
- Authentication: Required
- Response: `{ user: User, creditBalance: CreditBalance, activePlan: SubscriptionPlan | null }`

### Database Schema

The credit system uses the following tables:

#### CreditBalance
Stores user credit balances and allocation tracking:
- `userId` (UUID, primary key)
- `balance` (Decimal, 2 decimal places)
- `lastMonthlyAllocation` (Timestamp, nullable)
- `isNewUser` (Boolean)
- `createdAt`, `updatedAt` (Timestamps)

#### CreditTransaction
Records all credit operations:
- `id` (UUID, primary key)
- `userId` (UUID, foreign key)
- `type` (Enum: deduction, purchase, bonus, monthly_allowance)
- `amount` (Decimal, 2 decimal places)
- `balanceAfter` (Decimal, 2 decimal places)
- `description` (Text)
- `metadata` (JSONB, optional)
- `createdAt` (Timestamp)

#### SubscriptionPlan
Defines available credit packages:
- `id` (UUID, primary key)
- `name` (String)
- `credits` (Decimal, 2 decimal places)
- `price` (Decimal, 2 decimal places)
- `description` (Text)
- `isActive` (Boolean)
- `displayOrder` (Integer)
- `createdAt` (Timestamp)

#### UserPurchase
Tracks user purchases:
- `id` (UUID, primary key)
- `userId` (UUID, foreign key)
- `planId` (UUID, foreign key)
- `creditsAdded` (Decimal, 2 decimal places)
- `amountPaid` (Decimal, 2 decimal places)
- `status` (Enum: completed, pending, failed)
- `createdAt` (Timestamp)

#### GuestSession
Manages guest user sessions:
- `sessionId` (String, primary key)
- `balance` (Decimal, 2 decimal places)
- `createdAt` (Timestamp)
- `expiresAt` (Timestamp)

### Cron Jobs

#### Monthly Credit Allocation
- **Schedule**: Daily at midnight UTC
- **Function**: Checks all authenticated users for monthly allocation eligibility
- **Process**: Adds 200 credits to users who haven't received allocation in current month
- **Configuration**: See `lib/cron/monthly-allocation.ts`
- **Deployment**: Configure via Vercel Cron or similar service

### Security Features

- **Row-level locking**: Prevents race conditions during concurrent credit operations
- **Database transactions**: Ensures atomic credit operations
- **Authentication enforcement**: All credit endpoints require valid sessions
- **Input validation**: Zod schemas validate all API requests
- **Rate limiting**: Prevents abuse of API endpoints
- **Audit logging**: All credit operations are logged for monitoring

### Performance Optimizations

- **Database indexes**: Optimized queries on userId and createdAt fields
- **Redis caching**: Subscription plans cached with 24-hour TTL
- **Balance caching**: User balances cached with 60-second TTL
- **Connection pooling**: Efficient database connection management
- **Pagination**: Transaction and purchase history support pagination

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
