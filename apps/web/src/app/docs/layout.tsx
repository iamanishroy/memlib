import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { source } from "@/lib/source";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Logo } from "@/components/logo";

const layoutOptions: BaseLayoutProps = {
  nav: {
    title: (
      <>
        <Logo className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">MemLib</span>
      </>
    ),
    url: "/docs",
  },
  links: [
    {
      text: "← Dashboard",
      url: "/dash",
      external: false,
    },
  ],
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout {...layoutOptions} tree={source.pageTree}>
      {children}
    </DocsLayout>
  );
}
