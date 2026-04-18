// Example Corp product catalog — placeholder data for the tier321-mcp
// reference implementation. In a production deployment, this file mirrors
// an upstream source of truth; here it exists only to give every tool a
// realistic-shaped payload to return.
//
// When forking this repo for your own MCP server, replace this file with
// your own product data using the same shape.

export type ProductStatus = 'shipped' | 'shipped-beta' | 'in-development' | 'coming-soon'

export interface McpProduct {
  id: string
  name: string
  tagline: string
  description: string
  features: string[]
  status: ProductStatus
  href: string
}

export const products: McpProduct[] = [
  {
    id: 'alpha-platform',
    name: 'Alpha Platform',
    tagline: 'Flagship data platform',
    description:
      'Example Corp\'s flagship data platform. Ingests, transforms, and serves structured data to downstream consumers via typed APIs.',
    features: [
      'Typed ingestion pipeline',
      'Real-time transformation',
      'Schema-validated output',
      'Role-based access control',
    ],
    status: 'shipped',
    href: 'https://example.com/alpha',
  },
  {
    id: 'beta-studio',
    name: 'Beta Studio',
    tagline: 'Workflow authoring tool',
    description:
      'Visual workflow authoring for Alpha Platform. Draw, test, and deploy data pipelines without writing boilerplate.',
    features: [
      'Drag-and-drop pipeline editor',
      'Live preview with sample data',
      'One-click deploy to Alpha',
      'Version history per pipeline',
    ],
    status: 'shipped',
    href: 'https://example.com/beta',
  },
  {
    id: 'gamma-insights',
    name: 'Gamma Insights',
    tagline: 'Analytics dashboards',
    description:
      'Pre-built analytics dashboards on top of Alpha Platform data. Answer common operational questions without building a BI stack from scratch.',
    features: [
      'Prebuilt dashboard templates',
      'Custom metric builder',
      'Scheduled report delivery',
      'CSV + API export',
    ],
    status: 'shipped-beta',
    href: 'https://example.com/gamma',
  },
  {
    id: 'delta-sync',
    name: 'Delta Sync',
    tagline: 'Bi-directional data sync',
    description:
      'Connect Alpha Platform to external SaaS systems. Bi-directional sync, conflict resolution, and audit trail built in.',
    features: [
      'Bi-directional sync',
      'Last-write-wins or custom merge',
      'Full audit trail per record',
      'Retry and backoff on external errors',
    ],
    status: 'shipped-beta',
    href: 'https://example.com/delta',
  },
  {
    id: 'epsilon-auth',
    name: 'Epsilon Auth',
    tagline: 'Identity and access layer',
    description:
      'Identity and access layer for the Example Corp platform family. SSO, token lifecycle, and scoped API keys.',
    features: [
      'SAML + OIDC SSO',
      'Scoped API keys',
      'Programmatic token rotation',
      'Audit log export',
    ],
    status: 'in-development',
    href: 'https://example.com/epsilon',
  },
  {
    id: 'zeta-notify',
    name: 'Zeta Notify',
    tagline: 'Notification routing',
    description:
      'Route notifications from any Example Corp product to email, Slack, webhook, or SMS. Template authoring and delivery retry built in.',
    features: [
      'Multi-channel routing',
      'Template authoring',
      'Delivery retry with backoff',
      'Per-user quiet hours',
    ],
    status: 'in-development',
    href: 'https://example.com/zeta',
  },
  {
    id: 'eta-archive',
    name: 'Eta Archive',
    tagline: 'Long-term cold storage',
    description:
      'Long-term cold storage for data aging out of Alpha Platform. Retrieval API preserves the original schema for compliance audits.',
    features: [
      'Cold storage (S3-compatible)',
      'Schema-preserving retrieval',
      'Retention-policy engine',
      'Compliance-audit export',
    ],
    status: 'coming-soon',
    href: 'https://example.com/eta',
  },
  {
    id: 'theta-insights-v2',
    name: 'Theta Insights v2',
    tagline: 'Next-generation analytics',
    description:
      'Next-generation analytics for the Example Corp platform family. Replaces Gamma Insights with a real-time streaming core.',
    features: [
      'Streaming analytics core',
      'Sub-second dashboard refresh',
      'AI-assisted query builder',
      'Anomaly detection',
    ],
    status: 'coming-soon',
    href: 'https://example.com/theta',
  },
]
