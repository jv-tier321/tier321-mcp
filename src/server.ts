import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker'
import { registerBlogTools } from './tools/blog.js'
import { registerCompanyTools } from './tools/company.js'
import { registerContactTools } from './tools/contact.js'
import { registerIndustryTools } from './tools/industries.js'
import { registerProductTools } from './tools/products.js'
import { registerUseCaseTools } from './tools/use-cases.js'

export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: 'tier321-mcp-server',
      version: '0.1.0',
    },
    {
      // Workers-compatible JSON Schema validator — the default AjvJsonSchemaValidator
      // requires eval + CJS JSON imports which both fail in the V8 isolate runtime.
      jsonSchemaValidator: new CfWorkerJsonSchemaValidator(),
    },
  )

  registerCompanyTools(server)
  registerProductTools(server)
  registerBlogTools(server)
  registerIndustryTools(server)
  registerUseCaseTools(server)
  registerContactTools(server)

  return server
}
