// AI Jarwisyan — Repository Health Service

import { db } from "@/lib/db";

export const repoHealthService = {
  async createSnapshot(repositoryId: string) {
    const repo = await db.repository.findUnique({ where: { id: repositoryId } });
    if (!repo) throw new Error("Repository not found");
    return db.repositoryHealthSnapshot.create({
      data: {
        repositoryId,
        stars: repo.stars,
        forks: repo.forks,
        openIssues: repo.openIssues,
        watchers: repo.watchers,
        latestRelease: "",
        pushedAt: repo.pushedAtGithub,
      },
    });
  },

  async getTimeline(repositoryId: string) {
    return db.repositoryHealthSnapshot.findMany({
      where: { repositoryId },
      orderBy: { checkedAt: "desc" },
      take: 20,
    });
  },

  async calculateTrend(repositoryId: string) {
    const snapshots = await this.getTimeline(repositoryId);
    if (snapshots.length < 2) {
      return { direction: "stable" as const, starsDelta: 0, issuesDelta: 0, forksDelta: 0, note: "Недостаточно данных для тренда" };
    }
    const latest = snapshots[0];
    const previous = snapshots[snapshots.length - 1];
    const starsDelta = latest.stars - previous.stars;
    const issuesDelta = latest.openIssues - previous.openIssues;
    const forksDelta = latest.forks - previous.forks;
    const direction = starsDelta > 5 && issuesDelta <= 0 ? "improving" : starsDelta < -5 || issuesDelta > 10 ? "declining" : "stable";
    return {
      direction,
      starsDelta,
      issuesDelta,
      forksDelta,
      note: direction === "improving" ? "Растёт" : direction === "declining" ? "Падает" : "Стабильно",
    };
  },
};
