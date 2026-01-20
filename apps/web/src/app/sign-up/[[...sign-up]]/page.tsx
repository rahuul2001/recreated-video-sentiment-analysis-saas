import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl",
            headerTitle: "text-white",
            headerSubtitle: "text-gray-300",
            socialButtonsBlockButton: "bg-white/10 border-white/20 text-white hover:bg-white/20",
            formFieldLabel: "text-gray-300",
            formFieldInput: "bg-white/10 border-white/20 text-white",
            footerActionLink: "text-purple-400 hover:text-purple-300",
          },
        }}
      />
    </div>
  );
}
