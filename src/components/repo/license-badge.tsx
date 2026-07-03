'use client'

import { COMMERCIAL_META } from '@/lib/constants'
import type { CommercialStatus } from '@/lib/types'

export function LicenseStatusBadge({ license }: { license?: string | null }) {
  const status = classifyLicenseClient(license)
  const meta = COMMERCIAL_META[status]
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wide"
      style={{
        color: meta.color,
        borderColor: `${meta.color}40`,
        background: `${meta.color}15`,
      }}
      title={license || 'No license'}
    >
      {license || 'no license'} · {meta.label}
    </span>
  )
}

function classifyLicenseClient(license?: string | null): CommercialStatus {
  if (!license) return 'HIGH_RISK'
  const key = license.toLowerCase().trim()
  if (['mit', 'apache', 'apache-2.0', 'bsd', 'bsd-2-clause', 'bsd-3-clause', 'isc', 'unlicense', 'cc0-1.0'].includes(key)) {
    return 'SAFE'
  }
  if (['mpl', 'mpl-2.0', 'lgpl', 'lgpl-2.1', 'lgpl-3.0', 'gpl', 'gpl-2.0', 'gpl-3.0'].includes(key)) {
    return 'WARNING'
  }
  if (['agpl', 'agpl-3.0', 'sspl', 'server-side-public-license'].includes(key)) {
    return 'HIGH_RISK'
  }
  return 'WARNING'
}
