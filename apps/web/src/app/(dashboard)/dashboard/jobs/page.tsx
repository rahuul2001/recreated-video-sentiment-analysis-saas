export const dynamic = "force-dynamic";

import { getOrCreateUserWithOrg } from "~/server/auth";
import { prisma } from "~/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FileVideo,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";

export default async function JobsPage() {
  const session = await getOrCreateUserWithOrg();
  if (!session) redirect("/sign-in");

  const { org } = session;

  const jobs = await prisma.job.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    include: { mediaAsset: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analysis Jobs</h1>
          <p className="mt-1 text-slate-400">
            View and manage all your video analysis jobs
          </p>
        </div>
        <Link
          href="/dashboard/upload"
          className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
        >
          New Analysis
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search jobs..."
            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      {/* Jobs Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
              <FileVideo className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-white">No jobs yet</h3>
            <p className="mt-1 text-sm text-slate-400">
              Upload a video to start your first analysis
            </p>
            <Link
              href="/dashboard/upload"
              className="mt-4 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
            >
              Upload Video
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-left text-sm text-slate-400">
                <th className="px-6 py-4 font-medium">File</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Progress</th>
                <th className="px-6 py-4 font-medium">Created</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="transition-colors hover:bg-slate-800/50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
                        <FileVideo className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {job.mediaAsset.storageKey.split("/").pop()}
                        </p>
                        <p className="text-xs text-slate-500">
                          {job.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full transition-all ${
                            job.status === "SUCCEEDED"
                              ? "bg-green-500"
                              : job.status === "FAILED"
                              ? "bg-red-500"
                              : "bg-purple-500"
                          }`}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-400">
                        {job.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(job.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/jobs/${job.id}`}
                      className="text-sm font-medium text-purple-400 hover:text-purple-300"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: typeof CheckCircle2; label: string; color: string; bg: string }> = {
    SUCCEEDED: {
      icon: CheckCircle2,
      label: "Completed",
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    FAILED: {
      icon: AlertCircle,
      label: "Failed",
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    RUNNING: {
      icon: Clock,
      label: "Processing",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
    QUEUED: {
      icon: Clock,
      label: "Queued",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
  };

  const { icon: Icon, label, color, bg } = config[status] || config.QUEUED;

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${bg}`}>
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className={`text-xs font-medium ${color}`}>{label}</span>
    </div>
  );
}
