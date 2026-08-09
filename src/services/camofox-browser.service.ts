// CamoFox Browser Service — exclusive browser for JARVIS
// Connects to the CamoFox REST API running on localhost:9377

const CAMOFOX_URL = process.env.CAMOFOX_URL || "http://localhost:9377";
const CAMOFOX_USER_ID = process.env.CAMOFOX_USER_ID || "jarvis-web-agent";

export interface CamoFoxTab {
  tabId: string;
  url: string;
}

export interface CamoFoxSnapshot {
  url: string;
  title: string;
  snapshot: string;
  screenshot?: string; // base64
}

export const camofoxBrowserService = {
  async createTab(url: string, sessionId = "jarvis-main"): Promise<CamoFoxTab> {
    const res = await fetch(`${CAMOFOX_URL}/tabs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, userId: CAMOFOX_USER_ID, sessionKey: sessionId }),
    });
    if (!res.ok) throw new Error(`CamoFox createTab failed: ${res.status} ${await res.text()}`);
    return res.json();
  },

  async navigate(tabId: string, url: string): Promise<void> {
    const res = await fetch(`${CAMOFOX_URL}/tabs/${tabId}/navigate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, userId: CAMOFOX_USER_ID }),
    });
    if (!res.ok) throw new Error(`CamoFox navigate failed: ${res.status} ${await res.text()}`);
  },

  async snapshot(tabId: string, includeScreenshot = false): Promise<CamoFoxSnapshot> {
    const res = await fetch(`${CAMOFOX_URL}/tabs/${tabId}/snapshot?userId=${encodeURIComponent(CAMOFOX_USER_ID)}&includeScreenshot=${includeScreenshot}`);
    if (!res.ok) throw new Error(`CamoFox snapshot failed: ${res.status} ${await res.text()}`);
    return res.json();
  },

  async click(tabId: string, ref: string): Promise<void> {
    const res = await fetch(`${CAMOFOX_URL}/tabs/${tabId}/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref, userId: CAMOFOX_USER_ID }),
    });
    if (!res.ok) throw new Error(`CamoFox click failed: ${res.status} ${await res.text()}`);
  },

  async type(tabId: string, ref: string, text: string): Promise<void> {
    const res = await fetch(`${CAMOFOX_URL}/tabs/${tabId}/type`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref, text, userId: CAMOFOX_USER_ID }),
    });
    if (!res.ok) throw new Error(`CamoFox type failed: ${res.status} ${await res.text()}`);
  },

  async listTabs(sessionId = "jarvis-main"): Promise<CamoFoxTab[]> {
    const res = await fetch(`${CAMOFOX_URL}/tabs?userId=${encodeURIComponent(CAMOFOX_USER_ID)}&sessionKey=${encodeURIComponent(sessionId)}`);
    if (!res.ok) throw new Error(`CamoFox listTabs failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return Array.isArray(data) ? data : (Array.isArray(data.tabs) ? data.tabs : []);
  },

  async closeTab(tabId: string): Promise<void> {
    const res = await fetch(`${CAMOFOX_URL}/tabs/${tabId}?userId=${encodeURIComponent(CAMOFOX_USER_ID)}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`CamoFox closeTab failed: ${res.status} ${await res.text()}`);
  },

  async searchGoogle(query: string, sessionId = "jarvis-main"): Promise<CamoFoxSnapshot> {
    const tab = await this.createTab(`https://www.google.com/search?q=${encodeURIComponent(query)}`, sessionId);
    return this.snapshot(tab.tabId);
  },

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${CAMOFOX_URL}/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  },
};
