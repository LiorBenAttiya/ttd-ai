/**
 * config.ts — Static application configuration (real data, not mock)
 *
 * These are the actual companies Lior operates across.
 * Update here when company details change.
 */

export interface Company {
  id: string
  name: string
  domain: string
  color: string
  flag?: string
}

export const COMPANIES: Company[] = [
  { id: 'co1', name: 'MEP OSM Israel', domain: 'meposlm.co.il', color: '#0078d4', flag: '🇮🇱' },
  { id: 'co2', name: 'MEP OSM Poland', domain: 'meposlm.pl',    color: '#dc2626', flag: '🇵🇱' },
  { id: 'co3', name: 'MEP OSM UAE',    domain: 'meposlm.ae',    color: '#059669', flag: '🇦🇪' },
  { id: 'co4', name: 'LBA Tech',       domain: 'lbatech.com',   color: '#6366f1', flag: '🏢' },
  { id: 'co5', name: 'MedCode',        domain: 'medcode.co.il', color: '#0891b2', flag: '🏥' },
]
