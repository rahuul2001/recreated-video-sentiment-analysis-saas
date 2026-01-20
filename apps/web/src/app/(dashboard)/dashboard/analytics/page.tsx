export const dynamic = "force-dynamic";

import { getOrCreateUserWithOrg } from "~/server/auth";
import { prisma } from "~/server/db";
import { redirect } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  FileVideo,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default async function AnalyticsPage() {
  const session = await getOrCreateUserWithOrg();
  if (!session) redirect("/sign-in");

  const { org } = session;

  const [totalJobs, successfulJobs, failedJobs, recentJobs] = await Promise.all([
    prisma.job.count({ where: { orgId: org.id } }),
    prisma.job.count({ where: { orgId: org.id, status: "SUCCEEDED" } }),
    prisma.job.count({ where: { orgId: org.id, status: "FAILED" } }),
    prisma.job.findMany({
      where: { orgId: org.id, status: "SUCCEEDED" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="mt-1 text-slate-400">
          Overview of your video analysis performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Analyses"
          value={totalJobs}
          icon={FileVideo}
          trend={null}
        />
        <StatCard
          title="Successful"
          value={successfulJobs}
          icon={CheckCircle2}
          trend={successRate > 80 ? "up" : successRate > 50 ? null : "down"}
        />
        <StatCard
          title="Failed"
          value={failedJobs}
          icon={TrendingDown}
          trend={failedJobs > 0 ? "down" : null}
        />
        <StatCard
          title="Success Rate"
          value={`${successRate.toFixed(1)}%`}
          icon={TrendingUp}
          trend={successRate > 80 ? "up" : successRate > 50 ? null : "down"}
        />
      </div>

      {/* Processing Time Chart Placeholder */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-white">Processing Overview</h2>
        <p className="mt-1 text-sm text-slate-400">
          Analysis activity over time
        </p>

        {totalJobs === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-12 w-12 text-slate-600" />
            <p className="mt-4 text-slate-400">
              No data yet. Start analyzing videos to see your analytics.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-800/50 p-4">
              <p className="text-sm text-slate-400">This Week</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {recentJobs.filter(
                  (j) =>
                    new Date(j.createdAt) >
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length}
              </p>
              <p className="text-xs text-slate-500">analyses completed</p>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-4">
              <p className="text-sm text-slate-400">This Month</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {recentJobs.filter(
                  (j) =>
                    new Date(j.createdAt) >
                    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                ).length}
              </p>
              <p className="text-xs text-slate-500">analyses completed</p>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-4">
              <p className="text-sm text-slate-400">All Time</p>
              <p className="mt-1 text-2xl font-bold text-white">{successfulJobs}</p>
              <p className="text-xs text-slate-500">analyses completed</p>
            </div>
          </div>
        )}
      </div>

      {/* Usage Info */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-white">Usage</h2>
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Videos Analyzed</span>
              <span className="text-white">{totalJobs} / Unlimited</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-purple-500"
                style={{ width: `${Math.min(totalJobs, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Storage Used</span>
              <span className="text-white">-- / 10 GB</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-purple-500" style={{ width: "0%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  icon: typeof FileVideo;
  trend: "up" | "down" | null;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <Icon className="h-5 w-5 text-slate-500" />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-3xl font-bold text-white">{value}</p>
        {trend && (
          <span
            className={`text-sm ${
              trend === "up" ? "text-green-400" : "text-red-400"
            }`}
          >
            {trend === "up" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </div>
  );
}
