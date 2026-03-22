"use client";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { useScroll } from "@/hooks/use-scroll";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

const navLinks = [
	{ label: "Features", href: "#features" },
	{ label: "Docs", href: "/docs" },
	{ label: "GitHub", href: "https://github.com/iamanishroy/memlib" },
];

export function Header() {
	const scrolled = useScroll(10);

	return (
		<header
			className={cn("sticky top-0 z-50 w-full border-transparent border-b", {
				"border-border bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50":
					scrolled,
			})}
		>
			<nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
				<div className="flex items-center gap-6">
					<a
						className="flex items-center gap-2 py-2"
						href="/"
					>
						<Logo className="h-4 w-4 text-primary" />
						<span className="font-semibold text-sm">MemLib</span>
					</a>
					<div className="hidden items-center gap-1 md:flex">
						{navLinks.map((link) => (
							<a
								key={link.label}
								href={link.href}
								className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-muted dark:hover:bg-muted/50"
							>
								{link.label}
							</a>
						))}
					</div>
				</div>
				<div className="flex items-center gap-2">
					<ModeToggle />
					<Button
						className="hidden md:inline-flex"
						size="sm"
						render={<a href="/dash" />}
						nativeButton={false}
					>
						Get Started
					</Button>
				</div>
			</nav>
		</header>
	);
}
