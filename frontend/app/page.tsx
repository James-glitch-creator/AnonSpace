import { Lock, MessagesSquare, ShieldCheck, Users, VenetianMask } from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: VenetianMask,
    title: "Post anonymously",
    description: "No real names, no profiles tied to your identity. Just a handle and a voice.",
  },
  {
    icon: MessagesSquare,
    title: "Join communities",
    description: "Find people talking about what you care about, from dev to design to privacy.",
  },
  {
    icon: Lock,
    title: "Private, encrypted chat",
    description: "Message anyone one-on-one without exposing who you are.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/30">
            <VenetianMask className="h-5 w-5 text-slate-950" strokeWidth={2.25} />
          </span>
          <span className="text-lg font-extrabold leading-none tracking-tight text-white">
            Anon<span className="text-cyan-400">Space</span>
          </span>
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-300 transition-colors hover:text-white"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-cyan-600"
          >
            Sign Up
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="max-w-2xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
          Speak Freely.
          <br />
          <span className="text-cyan-400">Stay Anonymous.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-slate-400">
          Join millions who trust AnonSpace to protect their identity while sharing what matters
          most.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-cyan-600"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition-all duration-200 hover:bg-slate-900"
          >
            Log In
          </Link>
        </div>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-left"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
                <Icon className="h-5 w-5 text-cyan-400" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-cyan-500" /> End-to-end encrypted
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-500" /> Zero-knowledge
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-cyan-500" /> 6M+ anonymous members
          </span>
        </div>
      </main>
    </div>
  );
}
