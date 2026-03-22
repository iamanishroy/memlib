import { cn } from "@/lib/utils";
import type React from "react";

// LLM Providers
import { Openai } from "@/components/ui/svgs/openai";
import { OpenaiDark } from "@/components/ui/svgs/openaiDark";

import { AnthropicBlack } from "@/components/ui/svgs/anthropicBlack";
import { AnthropicWhite } from "@/components/ui/svgs/anthropicWhite";
import { GrokLight } from "@/components/ui/svgs/grokLight";
import { GrokDark } from "@/components/ui/svgs/grokDark";
import { OpenrouterLight } from "@/components/ui/svgs/openrouterLight";
import { OpenrouterDark } from "@/components/ui/svgs/openrouterDark";

// Database Providers

import { Neon } from "@/components/ui/svgs/neon";
import { Prisma } from "@/components/ui/svgs/prisma";
import { PrismaDark } from "@/components/ui/svgs/prismaDark";
import { Planetscale } from "@/components/ui/svgs/planetscale";
import { PlanetscaleDark } from "@/components/ui/svgs/planetscaleDark";

type TileData = {
	row: number;
	col: number;
	light?: React.ReactNode;
	dark?: React.ReactNode;
	alt?: string;
};

export function Integrations() {
	return (
		<div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 p-4 md:grid-cols-2 md:items-center">
			{/* Left Content */}
			<div className="max-w-xl space-y-5">
				<h2 className="font-medium text-3xl text-foreground tracking-tight sm:text-4xl md:text-5xl font-[family-name:var(--font-geist-sans)]">
					Bring Your Own Stack
				</h2>
				<p className="text-lg text-muted-foreground leading-8">
					Use any LLM provider and any Postgres-compatible database.
					No vendor lock-in — swap providers without changing a line of code.
				</p>
			</div>

			{/* Right Content - Visual */}
			<div className="place-items-end">
				<div className="mask-[radial-gradient(ellipse_at_center,black,black,transparent)] relative size-90">
					{tiles.map((tile) => (
						<IntegrationCard key={`${tile.row}_${tile.col}`} {...tile} />
					))}
				</div>
			</div>
		</div>
	);
}

function IntegrationCard({ row, col, light, dark }: TileData) {
	const hasLogo = light || dark;
	return (
		<div
			className={cn(
				"absolute flex size-18 items-center justify-center rounded-md border",
				hasLogo
					? "bg-card shadow-xs dark:bg-card/60"
					: "bg-secondary/30 dark:bg-background"
			)}
			style={{
				left: col * 72,
				top: row * 72,
			}}
		>
			{hasLogo && (
				<div className="size-8 overflow-hidden flex items-center justify-center [&_svg]:w-full [&_svg]:h-full">
					{light && <span className="flex items-center justify-center size-full dark:hidden">{light}</span>}
					{dark && <span className="hidden dark:flex items-center justify-center size-full">{dark}</span>}
					{light && !dark && <span className="hidden dark:flex items-center justify-center size-full">{light}</span>}
				</div>
			)}
		</div>
	);
}

const iconClass = "size-8";

const tiles: TileData[] = [
	// Row 0
	{ row: 0, col: 1 },
	{
		row: 0,
		col: 3,
		light: <Openai className={iconClass} />,
		dark: <OpenaiDark className={iconClass} />,
		alt: "OpenAI",
	},

	// Row 1
	{ row: 1, col: 0 },
	{
		row: 1,
		col: 2,
		light: <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Google_Gemini_icon_2025.svg/960px-Google_Gemini_icon_2025.svg.png" alt="Google Gemini" className={iconClass} />,
		alt: "Google Gemini",
	},
	{
		row: 1,
		col: 4,
		light: <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/supabase.webp" alt="Supabase" className={iconClass} />,
		alt: "Supabase",
	},

	// Row 2
	{
		row: 2,
		col: 1,
		light: <AnthropicBlack className={iconClass} />,
		dark: <AnthropicWhite className={iconClass} />,
		alt: "Anthropic",
	},
	{
		row: 2,
		col: 3,
		light: <Neon className={iconClass} />,
		alt: "Neon",
	},

	// Row 3
	{
		row: 3,
		col: 0,
		light: <Prisma className={iconClass} />,
		dark: <PrismaDark className={iconClass} />,
		alt: "Prisma",
	},
	{
		row: 3,
		col: 2,
		light: <GrokLight className={iconClass} />,
		dark: <GrokDark className={iconClass} />,
		alt: "Grok",
	},
	{
		row: 3,
		col: 4,
		light: <Planetscale className={iconClass} />,
		dark: <PlanetscaleDark className={iconClass} />,
		alt: "PlanetScale",
	},

	// Row 4
	{
		row: 4,
		col: 1,
		light: <OpenrouterLight className={iconClass} />,
		dark: <OpenrouterDark className={iconClass} />,
		alt: "OpenRouter",
	},
	{
		row: 4,
		col: 3,
		light: <img src="https://fly.io/static/images/brand/brandmark.svg" alt="Fly.io" className={iconClass} />,
		alt: "Fly.io",
	},
];
