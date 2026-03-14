import Link from "next/link";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="max-w-2xl text-center space-y-8">
        <div className="flex items-center justify-center gap-3">
          <Logo className="h-14 w-14 sm:h-16 sm:w-16" />
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            memz
          </h1>
        </div>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Your second brain. Store, recall, and connect your memories with
          AI-powered intelligence. Never forget an idea, a conversation, or a
          moment again.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Get Started
          </Link>
          <Link
            href="/dash"
            className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
