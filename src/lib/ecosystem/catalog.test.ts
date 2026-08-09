import { describe, expect, it } from "vitest";
import { parseRepositoryCatalog } from "./catalog";

describe("repository catalog", () => {
  it("canonicalizes and groups duplicates without installing", () => {
    const result = parseRepositoryCatalog('{"url":"https://github.com/OpenAI/example.git"}\nopenai/example\nnot a repo');
    expect(result.entries).toHaveLength(2);
    expect(result.entries[1].decision).toBe("DUPLICATE");
    expect(result.invalidLines).toEqual([3]);
  });
  it("rejects malformed JSONL lines", () => expect(parseRepositoryCatalog('{bad}').invalidLines).toEqual([1]));
  it("explicitly rejects the excluded repository", () => {
    const result = parseRepositoryCatalog('https://github.com/galstyanh992-max/instagithubanalizer');
    expect(result.entries[0]).toMatchObject({ decision: 'REJECT', identity: 'galstyanh992-max/instagithubanalizer' });
  });
});
