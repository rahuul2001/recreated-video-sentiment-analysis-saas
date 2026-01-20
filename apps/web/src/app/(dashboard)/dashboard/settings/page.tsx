export const dynamic = "force-dynamic";

import { getOrCreateUserWithOrg } from "~/server/auth";
import { redirect } from "next/navigation";
import { UserProfile } from "@clerk/nextjs";

export default async function SettingsPage() {
  const session = await getOrCreateUserWithOrg();
  if (!session) redirect("/sign-in");

  const { user, org } = session;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-slate-400">
          Manage your account and organization settings
        </p>
      </div>

      {/* Organization Info */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-white">Organization</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm text-slate-400">Organization Name</label>
            <p className="mt-1 text-white">{org.name}</p>
          </div>
          <div>
            <label className="text-sm text-slate-400">Organization ID</label>
            <p className="mt-1 font-mono text-sm text-slate-300">{org.id}</p>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-white">API Configuration</h2>
        <p className="mt-1 text-sm text-slate-400">
          Configure your Modal worker endpoint for video processing
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm text-slate-400">Modal Worker URL</label>
            <p className="mt-1 font-mono text-sm text-slate-300">
              {process.env.MODAL_URL || "Not configured"}
            </p>
          </div>
          <div>
            <label className="text-sm text-slate-400">Callback URL</label>
            <p className="mt-1 font-mono text-sm text-slate-300">
              {process.env.NEXT_PUBLIC_APP_URL || "Not configured"}
            </p>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Account</h2>
        <UserProfile
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-transparent shadow-none border-0",
              navbar: "hidden",
              pageScrollBox: "p-0",
              profileSection: "border-slate-800",
              profileSectionTitle: "text-slate-400",
              profileSectionTitleText: "text-slate-400",
              profileSectionContent: "text-white",
              formFieldLabel: "text-slate-400",
              formFieldInput: "bg-slate-800 border-slate-700 text-white",
              formButtonPrimary: "bg-purple-500 hover:bg-purple-600",
            },
          }}
        />
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
        <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
        <p className="mt-1 text-sm text-slate-400">
          Irreversible and destructive actions
        </p>
        <div className="mt-4">
          <button
            disabled
            className="rounded-lg border border-red-500/50 px-4 py-2 text-sm font-medium text-red-400 opacity-50 cursor-not-allowed"
          >
            Delete Organization
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Contact support to delete your organization
          </p>
        </div>
      </div>
    </div>
  );
}
