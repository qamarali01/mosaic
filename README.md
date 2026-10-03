# Mosaic — Crafted Product Management

A sophisticated Product Information Management (PIM) system for crafted product businesses. Mosaic combines a modern web application with an MCP (Model Context Protocol) server, enabling both human operators and AI assistants to manage products, orders, customers, and artisan workflows.

---

## Overview

Mosaic is designed for businesses that create and sell crafted products — managing the full lifecycle from product catalog through artisan production to customer delivery. The system provides:

- **Web Dashboard** — Human-friendly interface for daily operations
- **MCP Server** — AI-ready API enabling Claude and other assistants to manage everything programmatically
- **Customer Product Mappings** — Each customer can have unique SKUs, pricing, MOQ, and lead times for the same product
- **Artisan Production Tracking** — Assign work to artisans, track progress, and monitor delivery
- **Comprehensive Audit Trail** — Full history of all changes, including AI-initiated actions

---

## Features

### Web Application

- **Dashboard** — Overview with stats cards, recent quotes/orders, overdue assignments
- **Products** — Catalog management with images, documents, and customer mappings
- **Collections** — Group products into seasonal or thematic collections
- **Customers** — Contact and address management with product-specific pricing
- **Quotes** — Create quotes, track status, convert to orders
- **Orders** — Order management with artisan assignments and production tracking
- **Artisans** — Artisan profiles, workload, and assignment history
- **Settings** — User management and API key generation

### MCP Server (61 Tools)

AI assistants can perform all web operations plus:

- **Product Management** — Create, update, archive products with images and documents
- **Customer Mappings** — Set customer-specific SKUs, prices, MOQ, lead times
- **Quote to Order** — Convert accepted quotes into production orders
- **Artisan Assignments** — Assign work, track progress, detect overdue items
- **File Uploads** — Upload product images (public) and documents (private, signed URLs)
- **Admin Operations** — User management, API key management

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Users & AI Clients                       │
│  ┌──────────────┐              ┌──────────────────────────────┐ │
│  │  Human Ops   │              │  Claude.ai / MCP Clients     │ │
│  │  (Browser)   │              │  (OAuth 2.1 + Bearer Token)  │ │
│  └──────┬───────┘              └──────────────┬───────────────┘ │
└─────────┼──────────────────────────────────────┼─────────────────┘
          │                                      │
          │                                      │
┌─────────▼──────────────────────────────────────▼─────────────────┐
│                        Railway (Cloud Platform)                   │
│  ┌──────────────────────────┐      ┌───────────────────────────┐ │
│  │   Next.js Web App        │      │   MCP Server (Express)   │ │
│  │   (Port 3000)            │      │   (Port 3001)            │ │
│  │   - React 19             │      │   - OAuth 2.1 Provider   │ │
│  │   - Tailwind CSS 4       │      │   - 61 MCP Tools         │ │
│  │   - Radix UI Components  │      │   - Persistent Sessions  │ │
│  └──────────┬───────────────┘      └─────────────┬─────────────┘ │
└─────────────┼──────────────────────────────────────┼─────────────┘
              │                                      │
              └──────────────────┬───────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     Supabase           │
                    │   (PostgreSQL + RLS)   │
                    │   - Products           │
                    │   - Customers          │
                    │   - Orders & Quotes    │
                    │   - Artisans           │
                    │   - Mappings           │
                    │   - Audit Logs         │
                    │   - Storage Buckets    │
                    └───────────────────────┘
```

---

## Tech Stack

### Frontend (Next.js App)

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.2.10 | React framework with App Router |
| React | 19.2.4 | UI library |
| TypeScript | 5.0 | Type safety |
| Tailwind CSS | 4.0 | Styling |
| Radix UI | latest | Accessible UI primitives |
| React Hook Form | 7.82 | Form handling |
| Zod | 4.4.3 | Schema validation |
| TanStack Table | 8.21 | Data tables |
| Supabase SSR | 0.12 | Supabase client for Next.js |

### Backend (MCP Server)

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20+ | Runtime |
| Express | 4.21 | HTTP server |
| MCP SDK | 1.0.0 | Model Context Protocol |
| Supabase JS | 2.49 | Database client (service role) |
| Zod | 4.4.3 | Input validation |

### Database & Infrastructure

| Component | Purpose |
|-----------|---------|
| Supabase PostgreSQL | Primary database with RLS |
| Supabase Storage | Product images and documents |
| pg_trgm | Fuzzy search extension |
| Railway | Cloud deployment platform |

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm or pnpm
- Supabase account (free tier works)
- Railway account (for deployment)

### 1. Clone and Install

```bash
git clone https://github.com/your-org/mosaic.git
cd mosaic

# Install main app dependencies
npm install

# Install MCP server dependencies
cd mcp && npm install && cd ..
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the migrations in `supabase/migrations/` (copy-paste into Supabase SQL Editor)
3. Create storage buckets:
   - `product-images` (public)
   - `collection-images` (public)
   - `product-documents` (private)

4. Get your credentials from Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 3. Configure Environment

Create `.env.local` in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Create `.env` in the `mcp/` directory:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MCP_PORT=3001
```

### 4. Run Development Servers

```bash
# Terminal 1: Next.js app
npm run dev

# Terminal 2: MCP server
cd mcp && npm run dev
```

- Web app: http://localhost:3000
- MCP server health: http://localhost:3001/health

### 5. Create First User

1. Navigate to the login page (supabase auth handles this)
2. Sign up with email/password
3. The first user is automatically created in `user_profiles`

### 6. Generate API Key for MCP

1. Go to Settings → API Keys in the web app
2. Create a new key (admin role for full access)
3. Use this key when connecting from Claude.ai

---

## Environment Variables

### Web Application (`.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only)** |

**⚠️ Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. It bypasses RLS and has full database access.**

### MCP Server (`mcp/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | — | Supabase project URL (same as main app) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Service role key (bypasses RLS)** |
| `MCP_PORT` | No | `3001` | Port for MCP server |
| `RAILWAY_PUBLIC_DOMAIN` | Auto | — | Set by Railway for production URL |

**⚠️ The MCP server requires the service role key because it operates server-side with elevated permissions.**

---

## Database Schema

### Core Entities

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `user_profiles` | User accounts with roles | `id`, `email`, `role` (admin/sales/viewer) |
| `collections` | Product groupings | `id`, `name`, `description`, `status` |
| `products` | Product catalog | `id`, `sku`, `name`, `collection_id` |
| `customers` | Customer accounts | `id`, `name`, `payment_terms`, `currency` |
| `customer_product_mappings` | Customer-specific pricing | `customer_id`, `product_id`, `sku`, `price`, `moq` |
| `quotes` | Sales quotes | `id`, `customer_id`, `status`, `valid_until` |
| `quote_items` | Quote line items | `quote_id`, `product_id`, `quantity`, `price` |
| `orders` | Sales orders | `id`, `customer_id`, `status`, `total_amount` |
| `order_items` | Order line items | `order_id`, `product_id`, `quantity`, `price` |
| `artisans` | Craft makers | `id`, `name`, `contact`, `specializations` |
| `artisan_assignments` | Production assignments | `order_item_id`, `artisan_id`, `quantity`, `status` |
| `audit_logs` | Change history | `table_name`, `record_id`, `action`, `old_data`, `new_data` |
| `mcp_api_keys` | MCP authentication | `id`, `user_id`, `name`, `key_hash`, `role` |

### Relationships

```
collections ────< products
                      │
                      └────< customer_product_mappings >──── customers
                      │                                         │
                      └────< quote_items >──── quotes <─────────┘
                      │
                      └────< order_items >──── orders
                                │
                                └────< artisan_assignments >──── artisans
```

### Key Enums

- **User Roles**: `admin`, `sales`, `viewer`
- **Record Status**: `active`, `archived`
- **Quote Status**: `draft`, `sent`, `accepted`, `rejected`
- **Order Status**: `pending`, `confirmed`, `in_production`, `shipped`, `delivered`, `cancelled`
- **Assignment Status**: `pending`, `assigned`, `in_progress`, `completed`, `cancelled`

---

## Web Application

### Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/dashboard` | Stats, recent activity, overdue items | Authenticated |
| `/products` | Product list with search/filter | Authenticated |
| `/products/[id]` | Product detail with images, documents, mappings | Authenticated |
| `/collections` | Collection management | Authenticated |
| `/customers` | Customer list | Authenticated |
| `/customers/[id]` | Customer detail with contacts, addresses, mappings | Authenticated |
| `/quotes` | Quote list with status filter | Authenticated |
| `/quotes/new` | Create new quote | Sales+ |
| `/quotes/[id]` | Quote detail and edit | Sales+ |
| `/orders` | Order list with status filter | Authenticated |
| `/orders/new` | Create new order (from scratch or quote) | Sales+ |
| `/orders/[id]` | Order detail with assignments | Authenticated |
| `/artisans` | Artisan directory | Authenticated |
| `/artisans/[id]` | Artisan profile with workload, history | Authenticated |
| `/settings/users` | User management (role assignment) | Admin |
| `/settings/api-keys` | MCP API key management | Authenticated |

### Role-Based Access

| Role | Permissions |
|------|-------------|
| `viewer` | Read-only access to all data |
| `sales` | Create/edit products, customers, quotes, orders, artisans |
| `admin` | Full access including user management, permanent delete |

### Key UI Features

- **Data Tables** — Sortable, filterable, paginated (TanStack Table)
- **Command Palette** — Quick navigation with `Cmd+K`
- **Dark Mode** — Automatic + manual toggle (next-themes)
- **Form Validation** — Real-time with react-hook-form + Zod
- **File Uploads** — Drag-and-drop for images and documents
- **Audit Trail** — Visual diff of all changes
- **Status Workflows** — Enforced transitions for quotes/orders/assignments

---

## MCP Server

The MCP server exposes **61 tools** for AI assistants. See [`mcp/README.md`](./mcp/README.md) for complete tool reference.

### Tool Categories

| Category | Tools | Description |
|----------|-------|-------------|
| **Products** | 7 | CRUD operations, archive/restore |
| **Collections** | 5 | Collection management |
| **Customers** | 9 | Customer CRUD, contacts, addresses |
| **Product Mappings** | 4 | Customer-specific SKU/pricing |
| **Quotes** | 6 | Quote management, status, conversion |
| **Orders** | 6 | Order CRUD, status, production summary |
| **Artisans** | 7 | Artisan profiles, workload |
| **Assignments** | 5 | Production assignments, status |
| **Files** | 2 | Image and document uploads |
| **Admin** | 4 | User management, API keys |

### Authentication

The MCP server uses **OAuth 2.1 with Dynamic Client Registration**:

1. Generate API key in web app (Settings → API Keys)
2. Connect from Claude.ai using the MCP URL
3. OAuth flow presents a login form (API key input)
4. Successful auth returns a bearer token
5. All MCP requests include `Authorization: Bearer <token>`

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /.well-known/oauth-authorization-server` | OAuth 2.0 metadata (RFC 8414) |
| `GET /.well-known/oauth-protected-resource/mcp` | Protected resource metadata (RFC 9728) |
| `GET\|POST /authorize` | Authorization endpoint |
| `POST /token` | Token endpoint |
| `POST /register` | Dynamic Client Registration (RFC 7591) |
| `POST /revoke` | Token revocation (RFC 7009) |
| `POST /mcp` | MCP endpoint (requires bearer auth) |
| `GET /health` | Health check (no auth) |

### Connecting from Claude.ai

1. In Claude.ai, go to Settings → Connectors
2. Add "Mosaic" (custom connector)
3. Enter the MCP URL: `https://your-mcp-server.up.railway.app/mcp`
4. Complete OAuth flow with your API key
5. All 61 tools are now available in Claude

---

## Deployment

### Railway Setup

#### Web Application

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables in Railway dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY

# Deploy
railway up
```

#### MCP Server

```bash
# From the mcp/ directory
cd mcp
railway init

# Add environment variables:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - MCP_PORT=3001
# - RAILWAY_PUBLIC_DOMAIN (auto-set by Railway)

# Deploy
railway up
```

### Post-Deployment

1. Verify health endpoint: `https://your-app.up.railway.app/health`
2. Test MCP server: `https://your-mcp.up.railway.app/health`
3. Update `RAILWAY_PUBLIC_DOMAIN` if Railway doesn't auto-set it
4. Generate production API keys from the web app
5. Connect Claude.ai to the production MCP URL

### Important Notes

- **Session Persistence**: The MCP server uses in-memory sessions. Railway restarts (redeploys, idle timeouts) require reconnecting in Claude.ai
- **Stateless Mode**: For multi-instance deployment or higher resilience, remove the session map and use `sessionIdGenerator: undefined`
- **CORS**: Both servers trust Railway's proxy (`trust proxy: 1`)

---

## Project Structure

```
mosaic/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Authenticated routes
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── collections/
│   │   ├── customers/
│   │   ├── quotes/
│   │   ├── orders/
│   │   ├── artisans/
│   │   └── settings/
│   ├── login/                    # Supabase Auth
│   └── layout.tsx
├── components/
│   ├── ui/                       # 23 Radix-based primitives
│   └── shared/                   # 17 reusable components
├── features/                     # Feature-based components
│   ├── products/
│   ├── orders/
│   └── ...
├── lib/
│   ├── actions/                  # Server actions (products, orders, etc.)
│   ├── supabase/                 # Supabase client setup
│   ├── auth/
│   └── validations/              # Zod schemas
├── types/
│   └── index.ts                  # Full type definitions
├── mcp/                          # MCP Server
│   └── src/
│       ├── index.ts              # Express + OAuth setup
│       ├── provider.ts           # OAuth provider
│       ├── context.ts            # MCP context + roles
│       ├── tools/                # 10 tool modules
│       └── utils/
├── supabase/
│   └── migrations/               # SQL migrations
└── public/                       # Static assets
```

---

## Development

### Running Migrations

Migrations are plain SQL files in `supabase/migrations/`. Run them via Supabase SQL Editor or CLI:

```bash
# Using Supabase CLI
supabase db push
```

### Seed Data

The migrations include seed data for testing:
- Sample collections and products
- Test customer with mappings
- Example artisan

### Type Generation

Types are manually maintained in `types/index.ts`. In the future, you can auto-generate from Supabase:

```bash
supabase gen types typescript --project-id your-project-id > types/supabase.ts
```

### Testing

Manual testing is done via:
- Web UI (create/edit/delete workflows)
- Claude.ai (MCP tool invocation)
- Unit tests (planned)

---

## Security

### Row Level Security (RLS)

All tables use Supabase RLS policies:
- Users can only see/modify data based on their role
- MCP server bypasses RLS (service role) but enforces role checks in code

### API Key Storage

- Keys are SHA-256 hashed before storage
- No plaintext keys in database
- No key recovery (must regenerate if lost)

### Rate Limiting

MCP server implements role-based rate limiting:
- Admin: 1000 requests/minute
- Sales: 500 requests/minute
- Viewer: 200 requests/minute

### Audit Trail

All changes logged to `audit_logs`:
- Web UI actions (via Supabase triggers)
- MCP actions (explicit logging)
- Old and new data captured
- Timestamp and user attribution

---

## Troubleshooting

### MCP Connection Issues

**"Authorization with mosaic failed"**
- Verify API key is valid and not revoked
- Check `expiresAt` is set in token response
- Ensure `RAILWAY_PUBLIC_DOMAIN` matches your deployment URL

**"Connector unreachable"**
- Railway container may have restarted (sessions wiped)
- Reconnect in Claude.ai (disconnect and reconnect)
- Switch to stateless mode for resilience

**"Token has no expiration time"**
- Fixed in latest version — ensure `expiresAt` is set in `verifyAccessToken`

### Web App Issues

**Blank page or auth errors**
- Check Supabase credentials in `.env.local`
- Verify project is running in Supabase dashboard
- Clear browser storage and re-login

### Database Issues

**Permission denied errors**
- Check RLS policies in Supabase
- Verify user role in `user_profiles`
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is correct (MCP server)

---

## Ordering of Creation (Recommended)

When setting up Mosaic for the first time:

1. **Collections** — Create seasonal/thematic groupings
2. **Products** — Add products with images and documents
3. **Artisans** — Register craft makers
4. **Customers** — Add customers with contacts
5. **Customer Product Mappings** — Set customer-specific pricing/SKUs
6. **Quotes** — Create quotes for customers
7. **Orders** — Convert accepted quotes to orders
8. **Artisan Assignments** — Assign production work

---

## Roadmap

Planned improvements:

- [ ] Statelesss MCP mode (multi-instance resilience)
- [ ] Bulk import/export (CSV, Excel)
- [ ] Customer portal (order tracking)
- [ ] Invoice generation
- [ ] Email notifications (quote sent, order shipped)
- [ ] Production calendar view
- [ ] Inventory tracking
- [ ] Cost analysis and margin reports

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run type check (`npm run typecheck`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Support

For issues with:
- **Web Application** — Open a GitHub issue
- **MCP Server** — Open a GitHub issue or check `mcp/README.md`
- **Supabase** — Check Supabase dashboard logs
- **Deployment** — Check Railway logs (`railway logs`)

---

## Acknowledgments

- [Next.js](https://nextjs.org/) — React framework
- [Supabase](https://supabase.com/) — Backend-as-a-Service
- [Model Context Protocol](https://modelcontextprotocol.io/) — AI integration standard
- [Railway](https://railway.app/) — Deployment platform
- [Radix UI](https://www.radix-ui.com/) — Accessible UI primitives
- [Tailwind CSS](https://tailwindcss.com/) — Styling
