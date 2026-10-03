# Mosaic MCP Server

Model Context Protocol server for Mosaic — exposing 67 tools for AI assistants to manage products, orders, customers, artisan production, and export documents.

---

## Overview

This MCP server enables AI assistants like Claude to interact with the Mosaic PIM system programmatically. It implements:

- **OAuth 2.1 Authentication** — Dynamic Client Registration (RFC 7591) + API key authorization
- **Role-Based Access Control** — Admin, sales, and viewer permissions
- **Full Audit Trail** — All MCP actions logged with user attribution
- **Rate Limiting** — Role-based request throttling

---

## Quick Start

### Prerequisites

- Node.js 20+
- Supabase project with Mosaic schema
- API key generated from the web app

### Installation

```bash
cd mcp
npm install
```

### Configuration

Create `.env` file:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MCP_PORT=3001
```

### Run Development Server

```bash
npm run dev
```

Server starts at `http://localhost:3001`

### Health Check

```bash
curl http://localhost:3001/health
# → {"status":"ok","service":"mosaic-mcp","sessions":0,"timestamp":"..."}
```

---

## Connecting from Claude.ai

### Step 1: Generate API Key

1. Log into Mosaic web app
2. Go to Settings → API Keys
3. Create a new key with appropriate role (admin for full access)
4. Copy the key (starts with `msc_`)

### Step 2: Add Connector in Claude.ai

1. Go to Settings → Connectors
2. Add custom connector
3. Enter MCP URL: `https://your-mcp-server.up.railway.app/mcp`
4. Complete OAuth flow:
   - Enter your API key on the authorization page
   - Authorize the connection

### Step 3: Use Tools

All 61 tools are now available in Claude. Example prompts:

- "List all active products"
- "Create a new product with SKU PMX001 named 'Cat Wall Hanging'"
- "Create a quote for Shared Earth with these items..."
- "Show overdue artisan assignments"

---

## Authentication

### OAuth 2.1 Flow

```
┌─────────────┐                  ┌─────────────────┐
│   Claude.ai │                  │   MCP Server    │
└──────┬──────┘                  └────────┬────────┘
       │                                  │
       │ 1. Dynamic Client Registration   │
       │ POST /register                   │
       │ ───────────────────────────────► │
       │                                  │
       │ 2. Authorization Request         │
       │ GET /authorize?client_id=...     │
       │ ───────────────────────────────► │
       │                                  │
       │ 3. User enters API key           │
       │ POST /authorize (form)           │
       │ ───────────────────────────────► │
       │                                  │
       │ 4. Authorization Code            │
       │ ◄─────────────────────────────── │
       │                                  │
       │ 5. Token Exchange                │
       │ POST /token (code + PKCE)        │
       │ ───────────────────────────────► │
       │                                  │
       │ 6. Access Token                  │
       │ ◄─────────────────────────────── │
       │                                  │
       │ 7. MCP Requests                  │
       │ POST /mcp (Bearer token)         │
       │ ───────────────────────────────► │
       │                                  │
```

### API Key Storage

- Keys are SHA-256 hashed before database storage
- No plaintext keys stored
- No key recovery (must regenerate if lost)

### Role-Based Permissions

| Role | Capabilities |
|------|--------------|
| **viewer** | Read-only access to all data |
| **sales** | Create/edit products, customers, quotes, orders, artisans |
| **admin** | Full access including user management, permanent delete |

### Token Lifetime

- Access tokens do not expire (set to year 2099)
- No refresh tokens (API keys are long-lived)
- Revoke by deleting the API key from Settings

---

## Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/health` | GET | Health check | None |
| `/.well-known/oauth-authorization-server` | GET | OAuth 2.0 metadata (RFC 8414) | None |
| `/.well-known/oauth-protected-resource/mcp` | GET | Protected resource metadata (RFC 9728) | None |
| `/register` | POST | Dynamic Client Registration (RFC 7591) | None |
| `/authorize` | GET | Authorization form (API key input) | None |
| `/authorize` | POST | Submit authorization form | None |
| `/token` | POST | Token exchange (authorization code + PKCE) | None |
| `/revoke` | POST | Token revocation (RFC 7009) | Client auth |
| `/mcp` | POST | MCP endpoint | Bearer token |

---

## Tools Reference

### Products (7 tools)

| Tool | Role | Description |
|------|------|-------------|
| `list_products` | Any | List products with status filter and search |
| `get_product` | Any | Get product details with images, documents, mappings |
| `create_product` | sales+ | Create new product with SKU, name, description |
| `update_product` | sales+ | Update product fields |
| `archive_product` | sales+ | Soft delete product (preserve history) |
| `restore_product` | sales+ | Restore archived product |
| `delete_product` | admin | Permanently delete (fails if referenced) |

#### list_products

List products from the Mosaic catalog.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| status | enum | No | "active" | "active", "archived", or "all" |
| search | string | No | — | Search by name or SKU |
| page | number | No | 1 | Page number |
| page_size | number | No | 20 | Items per page (max 50) |

**Example:**

```json
{
  "status": "active",
  "search": "cat",
  "page": 1,
  "page_size": 20
}
```

#### get_product

Get full product details.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| product_id | string (UUID) | Yes | Product ID |

#### create_product

Create a new product.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| internal_sku | string | Yes | Internal SKU (1-100 chars) |
| name | string | Yes | Product name (1-200 chars) |
| description | string | No | Product description |
| collection_id | string (UUID) | No | Collection to assign |

#### update_product

Update product fields.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| product_id | string (UUID) | Yes | Product ID |
| name | string | No | New name |
| description | string | No | New description |
| internal_sku | string | No | New SKU |
| collection_id | string (UUID) | No | New collection (nullable) |

#### archive_product

Archive a product (soft delete).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| product_id | string (UUID) | Yes | Product ID |

#### restore_product

Restore an archived product.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| product_id | string (UUID) | Yes | Product ID |

#### delete_product

Permanently delete a product. Only works if no references exist.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| product_id | string (UUID) | Yes | Product ID |

**Errors:**

- "Cannot delete — product is referenced by X quote(s), Y order(s), Z customer mapping(s). Archive it instead."

---

### Collections (6 tools)

| Tool | Role | Description |
|------|------|-------------|
| `list_collections` | Any | List collections with filtering |
| `get_collection` | Any | Get collection with products |
| `create_collection` | sales+ | Create a collection |
| `update_collection` | sales+ | Update name/description |
| `archive_collection` | sales+ | Archive a collection |
| `restore_collection` | sales+ | Restore archived collection |

#### list_collections

List product collections.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| status | enum | No | "active" | "active", "archived", or "all" |
| search | string | No | — | Search by name |

#### get_collection

Get collection details with products.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| collection_id | string (UUID) | Yes | Collection ID |

#### create_collection

Create a new collection.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | Yes | Collection name (1-200 chars) |
| description | string | No | Collection description |

#### update_collection

Update collection fields.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| collection_id | string (UUID) | Yes | Collection ID |
| name | string | No | New name |
| description | string | No | New description |

---

### Customers (10 tools)

| Tool | Role | Description |
|------|------|-------------|
| `list_customers` | Any | List customers with pagination |
| `get_customer` | Any | Get customer with contacts, addresses, mappings |
| `create_customer` | sales+ | Create a customer |
| `update_customer` | sales+ | Update customer details |
| `archive_customer` | sales+ | Archive a customer |
| `restore_customer` | sales+ | Restore archived customer |
| `create_contact` | sales+ | Add a contact |
| `update_contact` | sales+ | Update a contact |
| `delete_contact` | sales+ | Delete a contact |
| `upsert_address` | sales+ | Add or update address |

#### list_customers

List customers.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| status | enum | No | "active" | "active", "archived", or "all" |
| search | string | No | — | Search by name |
| page | number | No | 1 | Page number |
| page_size | number | No | 20 | Items per page (max 50) |

#### get_customer

Get customer with all related data.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| customer_id | string (UUID) | Yes | Customer ID |

#### create_customer

Create a new customer.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| name | string | Yes | — | Customer name (1-200 chars) |
| currency | string | No | "USD" | 3-letter currency code |
| payment_terms | string | No | — | Payment terms |
| notes | string | No | — | Additional notes |

#### create_contact

Add a contact to a customer.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| customer_id | string (UUID) | Yes | — | Customer ID |
| name | string | Yes | — | Contact name |
| email | string | No | — | Contact email |
| phone | string | No | — | Contact phone |
| title | string | No | — | Job title |
| is_primary | boolean | No | false | Primary contact? |

#### upsert_address

Add or update a customer address.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| customer_id | string (UUID) | Yes | Customer ID |
| address_id | string (UUID) | No | Existing address ID (update) |
| type | enum | Yes | "billing" or "shipping" |
| address_line1 | string | Yes | Street address |
| address_line2 | string | No | Street address line 2 |
| city | string | Yes | City |
| state | string | No | State/province |
| postal_code | string | No | Postal code |
| country | string | Yes | Country |

---

### Product Mappings (4 tools)

| Tool | Role | Description |
|------|------|-------------|
| `get_customer_mappings` | Any | Get all mappings for a customer |
| `get_product_mappings` | Any | Get all customers for a product |
| `upsert_mapping` | sales+ | Create or update customer SKU/price |
| `delete_mapping` | sales+ | Delete a mapping |

#### upsert_mapping

Create or update a customer-product mapping.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| customer_id | string (UUID) | Yes | — | Customer ID |
| product_id | string (UUID) | Yes | — | Product ID |
| mapping_id | string (UUID) | No | — | Existing mapping ID (update) |
| customer_sku | string | Yes | — | Customer's SKU |
| customer_description | string | No | — | Customer's product description |
| price | number | Yes | — | Unit price |
| currency | string | No | "USD" | 3-letter currency |
| moq | number | No | — | Minimum order quantity |
| lead_time | string | No | — | Lead time |
| packaging_notes | string | No | — | Packaging instructions |

---

### Quotes (6 tools)

| Tool | Role | Description |
|------|------|-------------|
| `list_quotes` | Any | List quotes with status filter |
| `get_quote` | Any | Get quote with line items |
| `create_quote` | sales+ | Create quote with items |
| `update_quote` | sales+ | Update quote/items (full replacement) |
| `update_quote_status` | sales+ | Change status (draft→sent→accepted/rejected) |
| `convert_quote_to_order` | sales+ | Transform accepted quote to order |

#### create_quote

Create a new quote with line items.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| customer_id | string (UUID) | Yes | Customer ID |
| notes | string | No | Quote notes |
| valid_until | string | No | Validity date |
| items | array | Yes | Line items (min 1) |

**Line Item Schema:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| product_id | string (UUID) | Yes | Product ID |
| customer_sku | string | Yes | Customer SKU |
| customer_description | string | No | Customer's description |
| unit_price | number | Yes | Unit price |
| currency | string | Yes | 3-letter currency |
| quantity | number | Yes | Quantity |
| moq | number | No | MOQ |
| lead_time | string | No | Lead time |

#### update_quote

Update quote fields or items.

**IMPORTANT:** `items` is a full replacement — include all items you want to keep.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| quote_id | string (UUID) | Yes | Quote ID |
| notes | string | No | New notes |
| valid_until | string | No | New validity date |
| items | array | No | Full replacement items |

#### update_quote_status

Update quote status.

**Valid Transitions:**

- `draft` → `sent`
- `sent` → `accepted`
- `sent` → `rejected`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| quote_id | string (UUID) | Yes | Quote ID |
| status | enum | Yes | "draft", "sent", "accepted", "rejected" |

#### convert_quote_to_order

Convert an accepted quote into an order.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| quote_id | string (UUID) | Yes | Quote ID |
| order_number | string | Yes | Editable order number, unique per customer |
| order_number_type | enum | No | "customer_po", "internal", or "other" (default: "other") |
| notes | string | No | Order notes (defaults to quote notes) |

---

### Orders (7 tools)

| Tool | Role | Description |
|------|------|-------------|
| `list_orders` | Any | List orders with status filter |
| `get_order` | Any | Get order with items and assignments |
| `create_order` | sales+ | Create order with editable number and items |
| `update_order` | sales+ | Update pending/confirmed orders |
| `update_order_status` | sales+ | Update status with flow validation |
| `get_production_summary` | Any | Revenue vs production cost |
| `get_overdue_assignments` | Any | Assignments past delivery date |

#### create_order

Create a new order with line items.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| customer_id | string (UUID) | Yes | Customer ID |
| order_number | string | Yes | Editable order number, unique per customer |
| order_number_type | enum | No | "customer_po", "internal", or "other" (default: "other") |
| quote_id | string (UUID) | No | Linked quote ID |
| notes | string | No | Order notes |
| items | array | Yes | Line items (min 1) |

#### update_order_status

Update order status with validation.

**Valid Flow:**

```
pending → confirmed → in_production → shipped → delivered
    │                                      │
    └──────── cancelled ←─────────────────┘
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| order_id | string (UUID) | Yes | Order ID |
| status | enum | Yes | "pending", "confirmed", "in_production", "shipped", "delivered", "cancelled" |

#### get_production_summary

Get revenue vs production cost breakdown.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| order_id | string (UUID) | Yes | Order ID |

**Returns:**

- Total order revenue
- Total production cost (from artisan assignments)
- Margin analysis

---

### Artisans (7 tools)

| Tool | Role | Description |
|------|------|-------------|
| `list_artisans` | Any | List artisans with filtering |
| `get_artisan` | Any | Get artisan with assignment history |
| `create_artisan` | sales+ | Create artisan profile |
| `update_artisan` | sales+ | Update artisan details |
| `archive_artisan` | sales+ | Archive an artisan |
| `restore_artisan` | sales+ | Restore archived artisan |
| `get_artisan_workload` | Any | Get active assignments and capacity |

#### create_artisan

Create an artisan profile.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | Yes | Artisan name (1-200 chars) |
| phone | string | No | Phone number |
| email | string | No | Email |
| location | string | No | Location/address |
| specializations | string | No | Skills/specializations |
| notes | string | No | Additional notes |

#### get_artisan_workload

Get active assignments for an artisan.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| artisan_id | string (UUID) | Yes | Artisan ID |

**Returns:**

- All active assignments (pending, assigned, in_progress)
- Total active unit count
- Order and product details for each assignment

---

### Artisan Assignments (5 tools)

| Tool | Role | Description |
|------|------|-------------|
| `get_order_assignments` | Any | Get all assignments for an order |
| `create_assignment` | sales+ | Assign artisan to order item |
| `update_assignment` | sales+ | Update quantity, rate, dates |
| `update_assignment_status` | sales+ | Update status (triggers order workflow) |
| `delete_assignment` | sales+ | Remove an assignment |

#### create_assignment

Assign an artisan to an order line item.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| order_id | string (UUID) | Yes | Order ID |
| order_item_id | string (UUID) | Yes | Order line item ID |
| artisan_id | string (UUID) | Yes | Artisan to assign |
| quantity | number | Yes | Units to assign |
| rate | number | No | Artisan rate |
| expected_delivery_date | string | No | Expected delivery date |
| notes | string | No | Assignment notes |

**Validation:**

- Quantity cannot exceed remaining unassigned units
- Creates with status "pending"

#### update_assignment_status

Update assignment status with workflow triggers.

**Status Flow:**

```
pending → assigned → in_progress → completed
    │                        │
    └──────── cancelled ←───┘
```

**Auto-Triggers:**

- `in_progress` → Auto-promotes order from `confirmed` to `in_production`
- `completed` → Auto-sets `actual_delivery_date`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| assignment_id | string (UUID) | Yes | Assignment ID |
| status | enum | Yes | "pending", "assigned", "in_progress", "completed", "cancelled" |

---

### Files (2 tools)

| Tool | Role | Description |
|------|------|-------------|
| `upload_product_image` | sales+ | Upload product image (max 5MB) |
| `upload_product_document` | sales+ | Upload document (max 20MB) |

#### upload_product_image

Upload a product image.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| product_id | string (UUID) | Yes | Product ID |
| filename | string | Yes | Filename (1-200 chars) |
| mime_type | enum | Yes | "image/jpeg", "image/png", "image/webp" |
| content_base64 | string | Yes | Base64-encoded file content |

**Validation:**

- Max 5 MB
- Allowed types: JPEG, PNG, WebP
- Auto-increments sort_order

**Returns:**

- Image URL (public, permanent)

#### upload_product_document

Upload a product document.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| product_id | string (UUID) | Yes | Product ID |
| display_name | string | Yes | Display name (1-200 chars) |
| filename | string | Yes | Filename (1-200 chars) |
| mime_type | enum | Yes | "application/pdf", "image/jpeg", "image/png" |
| content_base64 | string | Yes | Base64-encoded file content |

**Validation:**

- Max 20 MB
- Allowed types: PDF, JPEG, PNG

**Returns:**

- Signed URL (valid for 1 hour)

---

### Admin (4 tools)

| Tool | Role | Description |
|------|------|-------------|
| `list_users` | admin | List all users with roles |
| `update_user_role` | admin | Change user role |
| `list_api_keys` | Any* | List MCP API keys (filtered by user) |
| `revoke_api_key` | Owner/admin | Revoke an API key |

#### list_users

List all Mosaic users.

**Parameters:** None

**Returns:**

Array of users with:

- `id` — User ID
- `email` — Email address
- `full_name` — Full name
- `role` — User role
- `created_at` — Account creation date

#### update_user_role

Change a user's role.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| user_id | string (UUID) | Yes | User ID |
| role | enum | Yes | "admin", "sales", "viewer" |

#### list_api_keys

List MCP API keys.

**Access:**

- Admins see all keys
- Non-admins see only their own keys

**Parameters:** None

**Returns:**

Array of API key metadata (no secret values):

- `id` — Key ID
- `user_id` — Owner ID
- `name` — Key name
- `role` — Key role
- `last_used_at` — Last usage timestamp
- `created_at` — Creation timestamp

#### revoke_api_key

Revoke an API key.

**Access:**

- Admins can revoke any key
- Non-admins can only revoke their own keys

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| key_id | string (UUID) | Yes | API key ID |

---

## Deployment

### Railway

```bash
# From mcp/ directory
railway init
railway up

# Set environment variables in Railway dashboard:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - MCP_PORT=3001
# - RAILWAY_PUBLIC_DOMAIN (auto-set)
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (bypasses RLS) |
| `MCP_PORT` | No | Server port (default: 3001) |
| `RAILWAY_PUBLIC_DOMAIN` | Auto | Public domain for OAuth issuer |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Claude.ai / MCP Client                │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ OAuth 2.1 + Bearer Token
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   Express HTTP Server                     │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │  OAuth Endpoints  │  │  MCP Endpoint (/mcp)        │ │
│  │  - /register      │  │  - Require Bearer Auth      │ │
│  │  - /authorize     │  │  - StreamableHTTPTransport  │ │
│  │  - /token         │  │  - Persistent Sessions       │ │
│  │  - /revoke        │  │                              │ │
│  └──────────────────┘  └──────────┬───────────────────┘ │
└───────────────────────────────────┼─────────────────────┘
                                    │
                                    │ Service Role
                                    ▼
                        ┌─────────────────────┐
                        │    Supabase         │
                        │  - PostgreSQL       │
                        │  - Storage Buckets  │
                        │  - Audit Logs       │
                        └─────────────────────┘
```

### Session Management

- **Persistent Sessions** — Each client gets a session ID
- **30-minute idle timeout** — Sessions cleaned up after inactivity
- **In-memory storage** — Sessions wiped on server restart (requires reconnect)

#### Stateless Mode (Recommended for Production)

To enable stateless mode (no session persistence, resilient to restarts):

```typescript
// In index.ts, change:
sessionIdGenerator: () => crypto.randomUUID(),

// To:
sessionIdGenerator: undefined,
```

Tradeoffs:

- ✅ Survives Railway restarts
- ✅ Horizontally scalable
- ✅ No reconnect needed
- ❌ No server-push capability
- ❌ Tools registered on every request (negligible overhead)

---

## Rate Limiting

Requests are throttled by role:

| Role | Requests/Minute |
|------|-----------------|
| admin | 1000 |
| sales | 500 |
| viewer | 200 |

Exceeded limits return HTTP 429 with retry-after header.

---

## Audit Trail

All MCP actions are logged to `audit_logs` table:

| Field | Description |
|-------|-------------|
| `table_name` | Entity type (products, orders, etc.) |
| `record_id` | Entity UUID |
| `action` | Action type (mcp_create, mcp_update, etc.) |
| `old_data` | Previous state (JSON) |
| `new_data` | New state (JSON) |
| `user_id` | User who performed the action |
| `metadata` | Additional context (tool name, arguments) |

---

## Debugging

### Test OAuth Flow

```bash
# 1. Register client
curl -X POST https://your-server/register \
  -H "Content-Type: application/json" \
  -d '{"client_name":"test","redirect_uris":["http://localhost:9999/cb"],"grant_types":["authorization_code"],"response_types":["code"],"token_endpoint_auth_method":"none"}'

# 2. Authorize (returns redirect with code)
curl -X POST https://your-server/authorize \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=CLIENT_ID&redirect_uri=http://localhost:9999/cb&response_type=code&code_challenge=CHALLENGE&code_challenge_method=S256&state=xyz&scope=mcp&api_key=msc_YOUR_KEY"

# 3. Exchange code for token
curl -X POST https://your-server/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=CODE&redirect_uri=http://localhost:9999/cb&client_id=CLIENT_ID&code_verifier=VERIFIER"

# 4. Call MCP
curl -X POST https://your-server/mcp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

### Check Logs

Railway:

```bash
railway logs --service mosaic-mcp
```

---

## Troubleshooting

### "Authorization with mosaic failed"

- Verify API key is valid and not revoked
- Check key role matches required permissions
- Ensure `RAILWAY_PUBLIC_DOMAIN` matches deployment URL

### "Connector unreachable"

- Railway container restarted (sessions wiped)
- Reconnect in Claude.ai (disconnect and reconnect)
- Consider switching to stateless mode

### "Token has no expiration time"

- Fixed in latest version
- Ensure `expiresAt` is set in `verifyAccessToken` (provider.ts)

### Tools not appearing in Claude

- Reconnect the connector
- Check Claude.ai logs for errors
- Verify MCP endpoint is accessible: `curl https://your-server/health`

---

## Security Best Practices

1. **Never commit `.env` files**
2. **Rotate API keys periodically**
3. **Use viewer role for read-only integrations**
4. **Monitor audit logs for suspicious activity**
5. **Enable 2FA on Supabase dashboard**
6. **Restrict service role key to MCP server only**

---

## License

MIT — See LICENSE file for details.
