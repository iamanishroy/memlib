"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { ModeToggle } from "./mode-toggle";

export default function Header() {
  const links = [
    { to: "/", label: "Home" },
    { to: "/dash", label: "Dashboard" },
  ] as const;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          {links.map(({ to, label }) => {
            return (
              <Link key={to} href={to}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Show when="signed-out">
            <SignInButton mode="redirect" forceRedirectUrl="/auth" />
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
      <hr />
    </div>
  );
}
