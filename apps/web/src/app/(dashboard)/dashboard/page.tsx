export const dynamic = "force-dynamic";

import { getOrCreateUserWithOrg } from "~/server/auth";
import { prisma } from "~/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  FileVideo,
  ArrowRight,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getOrCreateUserWithOrg();
  if (!session) redirect("/sign-in");

  const { user, org } = session;

  const [totalJobs, successfulJobs, pendingJobs, recentJobs] = await Promise.all([
    prisma.job.count({ where: { orgId: org.id } }),
    prisma.job.count({ where: { orgId: org.id, status: "SUCCEEDED" } }),
    prisma.job.count({ where: { orgId: org.id, status: { in: ["QUEUED", "RUNNING"] } } }),
    prisma.job.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { mediaAsset: true },
    }),
  ]);

  const stats = [
    {
      label: "Total Analyses",
      value: totalJobs,
      icon: FileVideo,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Completed",
      value: successfulJobs,
      icon: CheckCircle2,
      color: "from-green-500 to-emerald-500",
    },
    {
      label: "In Progress",
      value: pendingJobs,
      icon: Clock,
      color: "from-yellow-500 to-orange-500",
    },
    {
      label: "Success Rate",
      value: totalJobs > 0 ? `${Math.round((successfulJobs / totalJobs) * 100)}%` : "N/A",
      icon: TrendingUp,
      color: "from-purple-500 to-pink-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {user.name?.split(" ")[0] || "there"}!
          </h1>
          <p className="mt-1 text-slate-400">
            Here&apos;s what&apos;s happening with your video analyses.
          </p>
        </div>
        <Link
          href="/dashboard/upload"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
        >
          <Upload className="h-4 w-4" />
          New Analysis
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color}`}
              >
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div
              className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${stat.color} opacity-50`}
            />
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-white">Recent Analyses</h2>
          <Link
            href="/dashboard/jobs"
            className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
              <FileVideo className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-white">No analyses yet</h3>
            <p className="mt-1 text-sm text-slate-400">
              Upload your first video to get started
            </p>
            <Link
              href="/dashboard/upload"
              className="mt-4 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
            >
              Upload Video
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {recentJobs.map((job) => (
              <Link
                key={job.id}
                href={`/dashboard/jobs/${job.id}`}
                className="flex items-center justify-between p-4 transition-colors hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
                    <FileVideo className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {job.mediaAsset.storageKey.split("/").pop()}
                    </p>
                    <p className="text-sm text-slate-400">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <JobStatusBadge status={job.status} progress={job.progress} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function JobStatusBadge({ status, progress }: { status: string; progress: number }) {
  const config: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
    SUCCEEDED: {
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    FAILED: {
      icon: AlertCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    RUNNING: {
      icon: Clock,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
    QUEUED: {
      icon: Clock,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
  };

  const { icon: Icon, color, bg } = config[status] || config.QUEUED;

  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${bg}`}>
      <Icon className={`h-4 w-4 ${color}`} />
      <span className={`text-sm font-medium ${color}`}>
        {status === "RUNNING" ? `${progress}%` : status}
      </span>
    </div>
  );
}
