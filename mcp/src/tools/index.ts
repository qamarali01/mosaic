import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { McpContext } from "../context.js"
import { registerProductTools } from "./products.js"
import { registerCollectionTools } from "./collections.js"
import { registerCustomerTools } from "./customers.js"
import { registerMappingTools } from "./mappings.js"
import { registerQuoteTools } from "./quotes.js"
import { registerOrderTools } from "./orders.js"
import { registerArtisanTools } from "./artisans.js"
import { registerAssignmentTools } from "./assignments.js"
import { registerFileTools } from "./files.js"
import { registerAdminTools } from "./admin.js"

export function registerAllTools(server: McpServer, ctx: McpContext): void {
  registerProductTools(server, ctx)
  registerCollectionTools(server, ctx)
  registerCustomerTools(server, ctx)
  registerMappingTools(server, ctx)
  registerQuoteTools(server, ctx)
  registerOrderTools(server, ctx)
  registerArtisanTools(server, ctx)
  registerAssignmentTools(server, ctx)
  registerFileTools(server, ctx)
  registerAdminTools(server, ctx)
}
