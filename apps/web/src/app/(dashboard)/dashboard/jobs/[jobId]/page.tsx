export const dynamic = "force-dynamic";

import { getOrCreateUserWithOrg } from "~/server/auth";
import { prisma } from "~/server/db";
import { supabaseAdmin } from "~/server/supabase";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  RefreshCw,
} from "lucide-react";

interface PageProps {
  params: Promise<{ jobId: string }>;
}

interface AnalysisResult {
  overall: {
    dominantEmotion: string;
    dominantSentiment: string;
    escalationRisk: number;
    emotionDistribution: Record<string, number>;
    sentimentDistribution: Record<string, number>;
  };
  utterances: Array<{
    start: number;
    end: number;
    text: string;
    emotion: { label: string; score: number };
    sentiment: { label: string; score: number };
  }>;
}

export default async function JobDetailPage({ params }: PageProps) {
  const { jobId } = await params;
  const session = await getOrCreateUserWithOrg();
  if (!session) redirect("/sign-in");

  const { org } = session;

  const job = await prisma.job.findFirst({
    where: { id: jobId, orgId: org.id },
    include: { mediaAsset: true },
  });

  if (!job) notFound();

  let result: AnalysisResult | null = null;

  if (job.status === "SUCCEEDED" && job.resultJsonKey) {
    const { data } = await supabaseAdmin.storage
      .from("media")
      .download(job.resultJsonKey);

    if (data) {
      result = JSON.parse(await data.text());
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/jobs"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">
            {job.mediaAsset.storageKey.split("/").pop()}
          </h1>
          <p className="text-sm text-slate-400">Job ID: {job.id}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Status Card */}
      {(job.status === "QUEUED" || job.status === "RUNNING") && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white">
                {job.status === "QUEUED" ? "Waiting in queue..." : "Processing video..."}
              </h3>
              <p className="text-sm text-slate-400">
                This may take a few minutes depending on video length
              </p>
            </div>
            <div className="text-right">
              {/* <p className="text-sm text-slate-400">Complete</p> */}
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-purple-500 transition-all duration-500"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Card */}
      {job.status === "FAILED" && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">Analysis Failed</h3>
              <p className="mt-1 text-sm text-red-300">
                {job.errorMessage || "An unknown error occurred"}
              </p>
              {job.errorCode && (
                <p className="mt-2 text-xs text-slate-500">
                  Error code: {job.errorCode}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {job.status === "SUCCEEDED" && result && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <p className="text-sm text-slate-400">Dominant Emotion</p>
              <p className="mt-2 text-2xl font-bold capitalize text-white">
                {result.overall.dominantEmotion}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <p className="text-sm text-slate-400">Dominant Sentiment</p>
              <p className="mt-2 text-2xl font-bold capitalize text-white">
                {result.overall.dominantSentiment}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <p className="text-sm text-slate-400">Escalation Risk</p>
              <p className="mt-2 text-2xl font-bold text-white">
                {(result.overall.escalationRisk * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Emotion Distribution */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-lg font-semibold text-white">Emotion Distribution</h3>
            <div className="mt-4 space-y-3">
              {Object.entries(result.overall.emotionDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([emotion, score]) => (
                  <div key={emotion} className="flex items-center gap-4">
                    <span className="w-24 text-sm capitalize text-slate-400">
                      {emotion}
                    </span>
                    <div className="flex-1">
                      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                          style={{ width: `${score * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-16 text-right text-sm text-slate-300">
                      {(score * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Sentiment Distribution */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-lg font-semibold text-white">Sentiment Distribution</h3>
            <div className="mt-4 space-y-3">
              {Object.entries(result.overall.sentimentDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([sentiment, score]) => {
                  const colors: Record<string, string> = {
                    positive: "from-green-500 to-emerald-500",
                    neutral: "from-blue-500 to-cyan-500",
                    negative: "from-red-500 to-orange-500",
                  };
                  return (
                    <div key={sentiment} className="flex items-center gap-4">
                      <span className="w-24 text-sm capitalize text-slate-400">
                        {sentiment}
                      </span>
                      <div className="flex-1">
                        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full bg-gradient-to-r ${colors[sentiment] || "from-slate-500 to-slate-400"}`}
                            style={{ width: `${score * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-16 text-right text-sm text-slate-300">
                        {(score * 100).toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Utterances */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between border-b border-slate-800 p-6">
              <h3 className="text-lg font-semibold text-white">
                Transcript & Analysis
              </h3>
              <span className="text-sm text-slate-400">
                {result.utterances.length} segments
              </span>
            </div>
            <div className="divide-y divide-slate-800">
              {result.utterances.map((utterance, idx) => (
                <div key={idx} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-white">&quot;{utterance.text}&quot;</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatTime(utterance.start)} - {formatTime(utterance.end)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${getEmotionColor(utterance.emotion.label)}`}
                      >
                        {utterance.emotion.label} ({(utterance.emotion.score * 100).toFixed(0)}%)
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${getSentimentColor(utterance.sentiment.label)}`}
                      >
                        {utterance.sentiment.label}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: typeof CheckCircle2; label: string; color: string; bg: string }> = {
    SUCCEEDED: {
      icon: CheckCircle2,
      label: "Completed",
      color: "text-green-400",
      bg: "bg-green-500/10 border-green-500/30",
    },
    FAILED: {
      icon: AlertCircle,
      label: "Failed",
      color: "text-red-400",
      bg: "bg-red-500/10 border-red-500/30",
    },
    RUNNING: {
      icon: Clock,
      label: "Processing",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10 border-yellow-500/30",
    },
    QUEUED: {
      icon: Clock,
      label: "Queued",
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/30",
    },
  };

  const { icon: Icon, label, color, bg } = config[status] || config.QUEUED;

  return (
    <div className={`flex items-center gap-2 rounded-full border px-4 py-2 ${bg}`}>
      <Icon className={`h-4 w-4 ${color}`} />
      <span className={`text-sm font-medium ${color}`}>{label}</span>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getEmotionColor(emotion: string): string {
  const colors: Record<string, string> = {
    joy: "bg-yellow-500/20 text-yellow-300",
    sadness: "bg-blue-500/20 text-blue-300",
    anger: "bg-red-500/20 text-red-300",
    fear: "bg-purple-500/20 text-purple-300",
    surprise: "bg-pink-500/20 text-pink-300",
    disgust: "bg-green-500/20 text-green-300",
    neutral: "bg-slate-500/20 text-slate-300",
  };
  return colors[emotion] || colors.neutral;
}

function getSentimentColor(sentiment: string): string {
  const colors: Record<string, string> = {
    positive: "bg-green-500/20 text-green-300",
    negative: "bg-red-500/20 text-red-300",
    neutral: "bg-slate-500/20 text-slate-300",
  };
  return colors[sentiment] || colors.neutral;
}
