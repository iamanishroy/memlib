import type { ReactNode } from "react";
import llmModelsData from "@/lib/llm-models.json";

function ProviderIcon({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="size-4 shrink-0" loading="lazy" />;
}

export interface Provider {
  id: string;
  name: string;
  icon: ReactNode;
}

export interface LlmProvider extends Provider {
  models: { id: string; name: string }[];
}

const ICON_URLS: Record<string, string> = {
  openai:
    "https://static.vecteezy.com/system/resources/previews/022/227/364/non_2x/openai-chatgpt-logo-icon-free-png.png",
  gemini:
    "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/gemini-color.png",
  anthropic:
    "https://golden-storage-production.golden-support.com/topic_images/2eb79382ad63416682dcc08c91fcc46f.png",
};

export const EMBEDDING_PROVIDERS: Provider[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    icon: <ProviderIcon src={ICON_URLS.gemini!} alt="Gemini" />,
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: <ProviderIcon src={ICON_URLS.openai!} alt="OpenAI" />,
  },
];

export const LLM_PROVIDERS: LlmProvider[] = Object.entries(llmModelsData).map(
  ([id, data]) => ({
    id,
    name: data.name,
    icon: (
      <ProviderIcon
        src={ICON_URLS[id] ?? `https://cdn.simpleicons.org/${id}`}
        alt={data.name}
      />
    ),
    models: data.models,
  }),
);
