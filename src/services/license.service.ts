// AI Jarwisyan — License classification service

import { LICENSE_MAP, DEFAULT_LICENSE_NOTE } from "@/lib/constants";
import type { LicenseClassification, CommercialStatus } from "@/lib/types";

export const licenseService = {
  classifyLicense(licenseKey: string | undefined | null): LicenseClassification {
    if (!licenseKey) {
      return {
        status: "HIGH_RISK",
        notes: "No license file detected. Default copyright applies — all rights reserved by author. " + DEFAULT_LICENSE_NOTE,
        recommendation: "Request explicit license from maintainer before commercial use.",
      };
    }
    const key = licenseKey.toLowerCase().trim();
    if (key === "no-license" || key === "none" || key === "") {
      return {
        status: "HIGH_RISK",
        notes: "No license declared. " + DEFAULT_LICENSE_NOTE,
        recommendation: "Avoid commercial use until license is clarified.",
      };
    }
    const entry = LICENSE_MAP[key] ?? LICENSE_MAP["unknown"];
    const status: CommercialStatus = entry.status;
    const baseNotes: Record<CommercialStatus, string> = {
      SAFE: `Permissive license (${entry.label}). Generally safe for commercial use with attribution.`,
      WARNING: `Copyleft license (${entry.label}). Source-code disclosure may be required for derivative works.`,
      HIGH_RISK: `Strong copyleft / no license (${entry.label}). Significant commercial risk.`,
      UNKNOWN: `License '${entry.label}' not classified. Manual review required.`,
    };
    const recommendation: Record<CommercialStatus, string> = {
      SAFE: "Safe to use commercially; keep license notice in your project.",
      WARNING: "Consult legal before bundling into closed-source product.",
      HIGH_RISK: "Avoid for commercial closed-source use without legal counsel.",
      UNKNOWN: "Read the full LICENSE file and consult legal counsel.",
    };
    return {
      status,
      notes: baseNote(status, entry.label),
      recommendation: recommendation[status] + " " + DEFAULT_LICENSE_NOTE,
    };
  },
};

function baseNote(status: CommercialStatus, label: string): string {
  switch (status) {
    case "SAFE":
      return `Permissive license (${label}). Generally safe for commercial use with attribution.`;
    case "WARNING":
      return `Copyleft license (${label}). Source-code disclosure may be required for derivative works. ` + DEFAULT_LICENSE_NOTE;
    case "HIGH_RISK":
      return `Strong copyleft / no license (${label}). Significant commercial risk. ` + DEFAULT_LICENSE_NOTE;
    case "UNKNOWN":
      return `License '${label}' not classified. Manual review required. ` + DEFAULT_LICENSE_NOTE;
  }
}
