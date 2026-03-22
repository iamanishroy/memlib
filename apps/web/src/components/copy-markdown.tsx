"use client";

import { useState } from "react";

interface CopyMarkdownProps {
  title: string;
  /** raw MDX source or plain text to copy */
  slug: string[];
}

export function CopyMarkdown({ title, slug }: CopyMarkdownProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const url = `/docs/${slug.join("/")}`;
      const res = await fetch(url);
      const html = await res.text();

      // Extract the main article/docs content from the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const article =
        doc.querySelector("[data-docs-body]") ??
        doc.querySelector("article") ??
        doc.querySelector("main");

      if (!article) {
        // Fallback: copy the page URL
        await navigator.clipboard.writeText(
          `# ${title}\n\n${window.location.origin}${url}`,
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }

      // Convert to clean markdown-like text
      const text = articleToMarkdown(article, title);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md border border-fd-border bg-fd-secondary/50 px-3 py-1.5 text-xs font-medium text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
      title="Copy page content as markdown for LLMs"
    >
      {copied ? (
        <>
          <CheckIcon />
          Copied!
        </>
      ) : (
        <>
          <CopyIcon />
          Copy for LLM
        </>
      )}
    </button>
  );
}

function articleToMarkdown(el: Element, title: string): string {
  const lines: string[] = [`# ${title}`, ""];

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) lines.push(text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = (node as Element).tagName.toLowerCase();

    switch (tag) {
      case "h1":
        lines.push(`# ${node.textContent?.trim()}`);
        lines.push("");
        return;
      case "h2":
        lines.push(`## ${node.textContent?.trim()}`);
        lines.push("");
        return;
      case "h3":
        lines.push(`### ${node.textContent?.trim()}`);
        lines.push("");
        return;
      case "h4":
        lines.push(`#### ${node.textContent?.trim()}`);
        lines.push("");
        return;
      case "pre": {
        const code = (node as Element).querySelector("code");
        const lang =
          code
            ?.className?.match(/language-(\w+)/)?.[1]
            ?.replace("shiki", "")
            ?.trim() ?? "";
        lines.push(`\`\`\`${lang}`);
        lines.push(code?.textContent?.trim() ?? node.textContent?.trim() ?? "");
        lines.push("```");
        lines.push("");
        return;
      }
      case "code":
        if ((node as Element).closest("pre")) return;
        lines.push(`\`${node.textContent?.trim()}\``);
        return;
      case "ul":
      case "ol":
        for (const li of Array.from(node.childNodes)) {
          if (
            li.nodeType === Node.ELEMENT_NODE &&
            (li as Element).tagName === "LI"
          ) {
            lines.push(`- ${li.textContent?.trim()}`);
          }
        }
        lines.push("");
        return;
      case "table": {
        const rows = Array.from((node as Element).querySelectorAll("tr"));
        for (let i = 0; i < rows.length; i++) {
          const cells = Array.from(
            rows[i].querySelectorAll("th, td"),
          ).map((c) => c.textContent?.trim() ?? "");
          lines.push(`| ${cells.join(" | ")} |`);
          if (i === 0) {
            lines.push(`| ${cells.map(() => "---").join(" | ")} |`);
          }
        }
        lines.push("");
        return;
      }
      case "p":
        lines.push(node.textContent?.trim() ?? "");
        lines.push("");
        return;
      case "hr":
        lines.push("---");
        lines.push("");
        return;
      case "strong":
      case "b":
        lines.push(`**${node.textContent?.trim()}**`);
        return;
      case "em":
      case "i":
        lines.push(`*${node.textContent?.trim()}*`);
        return;
      default:
        for (const child of Array.from(node.childNodes)) {
          walk(child);
        }
    }
  };

  for (const child of Array.from(el.childNodes)) {
    walk(child);
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
