import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "lucide-react";

const navLinks = [
	{ href: "#features", label: "Features" },
	{ href: "/docs", label: "Docs" },
	{ href: "https://github.com/iamanishroy/memlib", label: "GitHub" },
];

const socialLinks = [
	{
		href: "https://x.com/iamanishroy",
		label: "X",
		icon: <XIcon />,
	},
	{
		href: "https://github.com/iamanishroy/memlib",
		label: "Github",
		icon: <GithubIcon />,
	},
];

export function Footer() {
	return (
		<footer>
			<div className="mx-auto max-w-5xl px-4 md:px-6">
				<div className="flex flex-col gap-6 py-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Logo className="h-4 w-4 text-primary" />
							<span className="font-semibold text-sm">MemLib</span>
						</div>
						<div className="flex items-center">
							{socialLinks.map(({ href, label, icon }) => (
								<Button key={label} size="icon-sm" variant="ghost" render={<a aria-label={label} href={href} target="_blank" rel="noreferrer" />} nativeButton={false}>{icon}</Button>
							))}
						</div>
					</div>

					<nav>
						<ul className="flex flex-wrap gap-4 font-medium text-muted-foreground text-sm md:gap-6">
							{navLinks.map((link) => (
								<li key={link.label}>
									<a className="hover:text-foreground" href={link.href}>
										{link.label}
									</a>
								</li>
							))}
						</ul>
					</nav>
				</div>
			</div>

			<div className="border-t">
				<div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 text-muted-foreground text-sm md:px-6">
					<p>&copy; {new Date().getFullYear()} MemLib</p>
					<p className="inline-flex items-center gap-1">
						<span>Built by</span>
						<a
							className="text-foreground/80 hover:text-foreground hover:underline"
							href="https://anishroy.com"
							target="_blank"
							rel="noreferrer"
						>
							Anish Roy
						</a>
					</p>
				</div>
			</div>
		</footer>
	);
}

function XIcon(props: React.ComponentProps<"svg">) {
	return (
		<svg
			fill="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path d="m18.9,1.153h3.682l-8.042,9.189,9.46,12.506h-7.405l-5.804-7.583-6.634,7.583H.469l8.6-9.831L0,1.153h7.593l5.241,6.931,6.065-6.931Zm-1.293,19.494h2.039L6.482,3.239h-2.19l13.314,17.408Z" />
		</svg>
	);
}
