import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, BookOpenIcon } from "lucide-react";

export function HeroSection() {
	return (
		<section className="mx-auto w-full max-w-5xl overflow-hidden pt-16">
			{/* Shades */}
			<div
				aria-hidden="true"
				className="absolute inset-0 size-full overflow-hidden pointer-events-none"
			>
				<div
					className={cn(
						"absolute inset-0 isolate -z-10",
						"bg-[radial-gradient(20%_80%_at_20%_0%,--theme(--color-primary/.15),transparent)]"
					)}
				/>
			</div>
			<div className="relative z-10 flex max-w-2xl flex-col gap-5 px-4">
				<a
					className={cn(
						"group flex w-fit items-center gap-3 rounded-sm border bg-card p-1 shadow-xs",
						"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards transition-all delay-500 duration-500 ease-out"
					)}
					href="/docs"
				>
					<div className="rounded-xs border bg-card px-1.5 py-0.5 shadow-sm">
						<p className="text-xs text-primary">NEW</p>
					</div>

					<span className="text-xs">Open source memory layer for AI</span>
					<span className="block h-5 border-l" />

					<div className="pr-1">
						<ArrowRightIcon className="size-3 -translate-x-0.5 duration-150 ease-out group-hover:translate-x-0.5" />
					</div>
				</a>

				<h1
					className={cn(
						"whitespace-nowrap font-semibold text-4xl leading-[1.1] tracking-tight md:text-5xl lg:text-6xl font-[family-name:var(--font-geist-sans)]",
						"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-100 duration-500 ease-out"
					)}
				>
					Memory for{" "}
					<span className="text-primary">AI&nbsp;Agents</span>
				</h1>

				<p
					className={cn(
						"text-muted-foreground text-base leading-relaxed sm:text-lg",
						"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-200 duration-500 ease-out"
					)}
				>
					Store, recall, and synthesize context across conversations.
					<br />
					Give your AI persistent memory in a few lines of code.
				</p>

				<div className="fade-in slide-in-from-bottom-10 flex w-fit animate-in items-center justify-center gap-3 fill-mode-backwards pt-2 delay-300 duration-500 ease-out">
					<Button variant="outline" render={<a href="/docs" />} nativeButton={false}>
						<BookOpenIcon data-icon="inline-start" />{" "}
						Read the Docs
					</Button>
					<Button render={<a href="/dash" />} nativeButton={false}>
						Get Started{" "}
						<ArrowRightIcon data-icon="inline-end" />
					</Button>
				</div>
			</div>
			<div className="relative">
				<div
					className={cn(
						"absolute -inset-x-20 inset-y-0 -translate-y-1/3 scale-120 rounded-full",
						"bg-[radial-gradient(ellipse_at_center,theme(--color-primary/.1),transparent,transparent)]",
						"blur-[50px]"
					)}
				/>
				<div
					className={cn(
						"mask-b-from-60% relative mt-8 overflow-hidden px-2 sm:mt-12 md:mt-20",
						"fade-in slide-in-from-bottom-5 animate-in fill-mode-backwards delay-100 duration-1000 ease-out"
					)}
				>
					<div className="relative inset-shadow-2xs inset-shadow-foreground/10 mx-auto max-w-5xl overflow-hidden rounded-lg bg-background shadow-xl ring-1 ring-card dark:inset-shadow-foreground/20 dark:inset-shadow-xs">
						<img
							alt="MemLib Dashboard"
							className="z-2 w-full rounded-lg dark:hidden"
							src="/screenshot-light.png"
						/>
						<img
							alt="MemLib Dashboard"
							className="hidden w-full rounded-lg bg-background dark:block"
							src="/screenshot-dark.png"
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
