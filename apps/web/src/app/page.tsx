import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Brain,
  FileVideo,
  MessageSquare,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  Code,
  Key,
  Terminal,
} from "lucide-react";

export default async function Home() {
  const { userId } = await auth();
  
  if (userId) {
    redirect("/dashboard");
  }

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Advanced emotion and sentiment detection using state-of-the-art transformer models",
    },
    {
      icon: MessageSquare,
      title: "Speech Transcription",
      description: "Accurate speech-to-text with Whisper, supporting multiple languages",
    },
    {
      icon: BarChart3,
      title: "Detailed Insights",
      description: "Comprehensive emotion distributions and sentiment breakdowns per utterance",
    },
    {
      icon: Zap,
      title: "Fast Processing",
      description: "Serverless GPU infrastructure for rapid video analysis at scale",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "SOC 2 compliant with end-to-end encryption for your sensitive content",
    },
    {
      icon: FileVideo,
      title: "Any Video Format",
      description: "Support for MP4, MOV, AVI, WebM and more video formats",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">VideoIntel</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="#features"
              className="text-sm font-medium text-slate-300 hover:text-white"
            >
              Features
            </Link>
            <Link
              href="#api"
              className="text-sm font-medium text-slate-300 hover:text-white"
            >
              API
            </Link>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-slate-300 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-950 to-slate-950" />
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-300">
              <Zap className="h-4 w-4" />
              Powered by Advanced AI
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
              Understand the{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                emotions
              </span>{" "}
              in your videos
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-400">
              Upload any video and get instant AI-powered analysis of emotions,
              sentiment, and escalation risk. Perfect for customer service,
              content moderation, and research.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#features"
                className="rounded-lg border border-slate-700 px-6 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">
              Everything you need for video intelligence
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Powerful features to analyze and understand your video content
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-purple-500/50 hover:bg-slate-900"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 transition-colors group-hover:bg-purple-500/20">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-slate-800 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">How it works</h2>
            <p className="mt-4 text-lg text-slate-400">
              Get insights from your videos in three simple steps
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Upload Video",
                description: "Drag and drop or select any video file up to 500MB",
              },
              {
                step: "02",
                title: "AI Processing",
                description: "Our AI transcribes and analyzes every utterance",
              },
              {
                step: "03",
                title: "Get Insights",
                description: "View detailed emotion and sentiment breakdowns",
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-2xl font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-6 text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Section */}
      <section id="api" className="border-t border-slate-800 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-300">
              <Code className="h-4 w-4" />
              Developer API
            </div>
            <h2 className="text-3xl font-bold text-white">
              Build with our REST API
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Integrate video intelligence into your applications with our simple API
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* API Features */}
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                  <Key className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">API Key Authentication</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Secure Bearer token authentication. Generate keys from your dashboard.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                  <Zap className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Simple Integration</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Submit videos via URL or base64. Poll for results or use webhooks.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                  <Terminal className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">RESTful Endpoints</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Two simple endpoints: POST to analyze, GET to check status.
                  </p>
                </div>
              </div>
            </div>

            {/* Code Example */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6">
              <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
                <Terminal className="h-4 w-4" />
                Quick Start
              </div>
              <pre className="overflow-x-auto text-sm">
                <code className="text-slate-300">
{`# Submit a video for analysis
curl -X POST /api/v1/analyze \\
  -H "Authorization: Bearer vi_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"videoUrl": "https://..."}'

# Response
{
  "jobId": "clxxx",
  "status": "QUEUED"
}

# Check job status
curl /api/v1/jobs/{jobId} \\
  -H "Authorization: Bearer vi_xxx"

# Response (when complete)
{
  "status": "SUCCEEDED",
  "results": {
    "dominant_emotion": "neutral",
    "escalation_risk": 0.15,
    "utterances": [...]
  }
}`}
                </code>
              </pre>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-6 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              <Key className="h-4 w-4" />
              Get Your API Key
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-slate-800 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to understand your videos?
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Start analyzing videos today with our free trial. No credit card required.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/sign-up"
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-400">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              Free 14-day trial
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              No credit card
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              Cancel anytime
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-white">VideoIntel</span>
            </div>
            <p className="text-sm text-slate-500">
              Made with ❤️ by Rahul Tangsali
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
