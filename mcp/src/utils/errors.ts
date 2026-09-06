export function mcpError(message: string): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
  }
}

export function mcpSuccess<T>(data: T): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
  }
}
