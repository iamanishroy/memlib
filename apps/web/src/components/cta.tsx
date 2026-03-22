import { Button } from "@/components/ui/button";
import { ArrowRightIcon, StarIcon } from "lucide-react";

export function CallToAction() {
	return (
		<div className="relative mx-auto flex w-full max-w-3xl flex-col justify-between gap-y-6 rounded-4xl border bg-card px-4 py-8 shadow-sm md:py-10 dark:bg-card/50">
			<div className="space-y-2">
				<h2 className="text-center font-semibold text-lg tracking-tight md:text-2xl font-[family-name:var(--font-geist-sans)]">
					Give your AI persistent memory.
				</h2>
				<p className="text-balance text-center text-muted-foreground text-sm md:text-base">
					Open source. Self-hosted. Ready in minutes.
				</p>
			</div>
			<div className="flex items-center justify-center gap-2">
				<Button className="shadow" variant="outline" render={<a href="https://github.com/iamanishroy/memlib" target="_blank" rel="noreferrer" />} nativeButton={false}>
					<StarIcon data-icon="inline-start" />
					Star us on GitHub
				</Button>
				<Button className="shadow" render={<a href="/dash" />} nativeButton={false}>
					Get Started{" "}
					<ArrowRightIcon data-icon="inline-end" />
				</Button>
			</div>
		</div>
	);
}
