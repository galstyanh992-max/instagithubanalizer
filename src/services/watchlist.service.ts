// AI Jarwisyan — Watchlist service

import { db } from "@/lib/db";
import type { RepoMetadata } from "@/lib/types";

export const watchlistService = {
  async addToWatchlist(repositoryId: string) {
    return db.repository.update({
      where: { id: repositoryId },
      data: { isWatchlisted: true, lastCheckedAt: new Date() },
    });
  },

  async removeFromWatchlist(repositoryId: string) {
    return db.repository.update({
      where: { id: repositoryId },
      data: { isWatchlisted: false },
    });
  },

  async captureSnapshot(repositoryId: string, before: { stars: number; forks: number; openIssues: number }, after: RepoMetadata) {
    return db.watchlistSnapshot.create({
      data: {
        repositoryId,
        starsDelta: after.stars - before.stars,
        forksDelta: after.forks - before.forks,
        issuesDelta: after.openIssues - before.openIssues,
        newReleaseDetected: false, // would need releases API
        lastCommitDelta: after.pushedAtGithub ?? "",
        breakingChangesNote: "",
      },
    });
  },

  async listSnapshots(repositoryId: string) {
    return db.watchlistSnapshot.findMany({
      where: { repositoryId },
      orderBy: { capturedAt: "desc" },
      take: 20,
    });
  },
};
