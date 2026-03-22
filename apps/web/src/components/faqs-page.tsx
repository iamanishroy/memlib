import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

export function FaqsPage() {
	return (
		<div className="mx-auto w-full max-w-5xl">
			<div className="mx-4 grid grid-cols-1 md:mx-0 md:grid-cols-2">
				<div className="space-y-5 px-4 pt-12 pb-4">
					<h2 className="font-medium text-3xl text-foreground tracking-tight sm:text-4xl md:text-5xl font-[family-name:var(--font-geist-sans)]">FAQs</h2>
					<p className="text-lg text-muted-foreground leading-8">
						Common questions about MemLib. Can't find your answer?{" "}
						<a className="text-primary hover:underline" href="https://github.com/iamanishroy/memlib/issues">
							Open an issue
						</a>.
					</p>
				</div>
				<div className="place-content-center">
					<Accordion
						className="rounded-lg border"
					>
						{questions.map((item) => (
							<AccordionItem className="px-4" key={item.id} value={item.id}>
								<AccordionTrigger className="py-4 text-base hover:no-underline focus-visible:underline focus-visible:ring-0">
									{item.title}
								</AccordionTrigger>
								<AccordionContent className="pb-4 text-sm text-muted-foreground leading-relaxed">
									{item.content}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</div>
			</div>
		</div>
	);
}

const questions = [
	{
		id: "item-1",
		title: "What is MemLib?",
		content:
			"MemLib is an open-source memory layer for AI agents and applications. It provides persistent, semantic memory that lets your AI remember context across conversations, sessions, and users.",
	},
	{
		id: "item-2",
		title: "How does it work?",
		content:
			"MemLib uses LLMs to extract structured facts from natural language, stores them with vector embeddings in Postgres, and retrieves them semantically when needed. You can store, recall, and synthesize context with just a few lines of code.",
	},
	{
		id: "item-3",
		title: "Which LLM providers are supported?",
		content:
			"MemLib works with OpenAI, Google Gemini, and Anthropic out of the box. It's provider-agnostic — you can swap providers without changing your application code.",
	},
	{
		id: "item-4",
		title: "Do I need a specific database?",
		content:
			"MemLib works with any Postgres-compatible database that supports pgvector. This includes Supabase, Neon, PlanetScale, AWS RDS, Fly Postgres, and any standard Postgres installation.",
	},
	{
		id: "item-5",
		title: "Is my data secure?",
		content:
			"Yes. MemLib is self-hosted — all memories stay in your own database. Data is scoped by namespace and entity, so different users or sessions are fully isolated. Nothing leaves your infrastructure.",
	},
	{
		id: "item-6",
		title: "Can I customize the prompts?",
		content:
			"Absolutely. You can override extraction prompts, synthesis templates, and system instructions to tailor memory behavior to your exact use case.",
	},
	{
		id: "item-7",
		title: "Is MemLib free to use?",
		content:
			"MemLib is open source and free to use. You only pay for the LLM provider calls and database hosting you choose.",
	},
];
