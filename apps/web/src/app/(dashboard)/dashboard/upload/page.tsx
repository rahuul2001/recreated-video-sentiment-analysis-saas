"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileVideo, X, Loader2, CheckCircle2 } from "lucide-react";

type UploadState = "idle" | "uploading" | "processing" | "success" | "error";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("video/")) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError("Please upload a video file");
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith("video/")) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please upload a video file");
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setUploadState("uploading");
    setProgress(0);
    setError(null);

    try {
      // Step 1: Get signed upload URL
      const urlRes = await fetch("/api/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mimeType: file.type,
          filename: file.name,
        }),
      });

      if (!urlRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { mediaAssetId, storageKey, signedUrl, token } = await urlRes.json();
      setProgress(20);

      // Step 2: Upload file to Supabase
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          ...(token && { "x-upsert": "true" }),
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file");
      }
      setProgress(50);

      // Step 3: Trigger analysis
      setUploadState("processing");
      const analyzeRes = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaAssetId, storageKey }),
      });

      if (!analyzeRes.ok) {
        throw new Error("Failed to start analysis");
      }

      const { jobId } = await analyzeRes.json();
      setProgress(100);
      setUploadState("success");

      // Redirect to job page after short delay
      setTimeout(() => {
        router.push(`/dashboard/jobs/${jobId}`);
      }, 1500);
    } catch (err) {
      setUploadState("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadState("idle");
    setProgress(0);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Upload Video</h1>
        <p className="mt-2 text-slate-400">
          Upload a video file to analyze its emotional content and sentiment.
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-all ${
          dragActive
            ? "border-purple-500 bg-purple-500/10"
            : file
            ? "border-green-500/50 bg-green-500/5"
            : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
        }`}
      >
        {uploadState === "idle" && !file && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
              <Upload className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-white">
              Drop your video here
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              or click to browse from your computer
            </p>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </>
        )}

        {file && uploadState === "idle" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <FileVideo className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <p className="font-medium text-white">{file.name}</p>
              <p className="text-sm text-slate-400">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={resetUpload}
                className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                Remove
              </button>
              <button
                onClick={handleUpload}
                className="flex items-center gap-2 rounded-lg bg-purple-500 px-6 py-2 text-sm font-medium text-white hover:bg-purple-600"
              >
                <Upload className="h-4 w-4" />
                Start Analysis
              </button>
            </div>
          </div>
        )}

        {(uploadState === "uploading" || uploadState === "processing") && (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-white">
                {uploadState === "uploading" ? "Uploading..." : "Starting analysis..."}
              </p>
              <p className="text-sm text-slate-400">{progress}% complete</p>
            </div>
            <div className="mx-auto h-2 w-64 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {uploadState === "success" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <p className="font-medium text-white">Analysis started!</p>
              <p className="text-sm text-slate-400">Redirecting to job details...</p>
            </div>
          </div>
        )}

        {uploadState === "error" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <X className="h-8 w-8 text-red-400" />
            </div>
            <div>
              <p className="font-medium text-white">Upload failed</p>
              <p className="text-sm text-red-400">{error}</p>
            </div>
            <button
              onClick={resetUpload}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Supported Formats */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="font-medium text-white">Supported formats</h3>
        <p className="mt-2 text-sm text-slate-400">
          MP4, MOV, AVI, WebM • Max file size: 500MB • Audio must be present for
          transcription
        </p>
      </div>
    </div>
  );
}
