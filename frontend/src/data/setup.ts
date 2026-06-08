// ── Company + email config (mirrors DB) ───────────────────────
// In production this comes from GET /api/v1/companies with emails.
// For now it's editable local state seeded from your actual data.

export interface CompanyEmail {
  id: string
  email: string
  person_name: string
  label: 'primary' | 'delegate' | 'cc' | 'other'
  active: boolean
}

export interface CompanyConfig {
  id: string
  name: string
  color: string
  flag: string
  emails: CompanyEmail[]
}

export const defaultCompanies: CompanyConfig[] = [
  {
    id: 'co1', name: 'MEP OSM Israel', color: '#0078d4', flag: '🇮🇱',
    emails: [
      { id: 'e1', email: 'liorba@mepsltn.com', person_name: 'Lior',    label: 'primary',  active: true },
    ],
  },
  {
    id: 'co2', name: 'MEP OSM Poland', color: '#dc2626', flag: '🇵🇱',
    emails: [
      { id: 'e2', email: 'liorba@mepsltn.com', person_name: 'Lior',    label: 'primary',  active: true },
    ],
  },
  {
    id: 'co3', name: 'MEP OSM UAE',    color: '#059669', flag: '🇦🇪',
    emails: [
      { id: 'e3', email: 'liorba@mepsltn.com', person_name: 'Lior',    label: 'primary',  active: true },
    ],
  },
  {
    id: 'co4', name: 'LBATech',        color: '#6366f1', flag: '🏢',
    emails: [
      { id: 'e4', email: 'lior@lbatech.com',   person_name: 'Lior',    label: 'primary',  active: true },
    ],
  },
  {
    id: 'co5', name: 'MedCode',        color: '#0891b2', flag: '🏥',
    emails: [
      { id: 'e5', email: 'lior@lbatech.com',   person_name: 'Lior',    label: 'primary',  active: true },
    ],
  },
]

export const LABEL_COLORS = {
  primary:  { bg: 'rgba(52,211,153,0.12)',  text: '#34d399',  label: 'Primary' },
  delegate: { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b',  label: 'Delegate' },
  cc:       { bg: 'rgba(99,102,241,0.12)',  text: '#a5b4fc',  label: 'CC' },
  other:    { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8',  label: 'Other' },
}
