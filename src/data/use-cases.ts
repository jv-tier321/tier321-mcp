// Example Corp use-case catalog — placeholder data for the tier321-mcp
// reference implementation. The test suite enforces a count of 4
// (list_use_cases > returns the 4 use cases).

export interface UseCase {
  slug: string
  name: string
  description: string
}

export const useCases: UseCase[] = [
  {
    slug: 'data-ingestion',
    name: 'Data Ingestion',
    description:
      'Collect structured data from external sources and land it in Alpha Platform. Handles schema validation, retry, and dead-letter queues.',
  },
  {
    slug: 'workflow-automation',
    name: 'Workflow Automation',
    description:
      'Author and deploy multi-step workflows that span the Example Corp product family. Triggers, branching, and scheduled runs.',
  },
  {
    slug: 'analytics-dashboards',
    name: 'Analytics Dashboards',
    description:
      'Assemble operational dashboards on top of Alpha Platform data without building a BI stack. Pre-built templates plus custom metrics.',
  },
  {
    slug: 'compliance-reporting',
    name: 'Compliance Reporting',
    description:
      'Export audit-ready reports from platform history. Retains original schema for regulated industries.',
  },
]
