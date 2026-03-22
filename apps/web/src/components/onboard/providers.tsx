import {
  LLM_PROVIDERS as AI_LLM_PROVIDERS,
  EMBEDDING_PROVIDERS as AI_EMBEDDING_PROVIDERS,
  PROVIDER_LOGOS,
} from "@memlib/ai";
import type { ReactNode } from "react";

// ─── SVG Logo Renderer ───────────────────────────────────────────

function ProviderLogo({
  providerId,
  className = "size-4",
}: {
  providerId: string;
  className?: string;
}) {
  const url = PROVIDER_LOGOS[providerId];
  if (!url) return null;
  return (
    <img src={url} alt="" className={`${className} shrink-0`} loading="lazy" />
  );
}

// ─── Shared Types ────────────────────────────────────────────────

export interface Provider {
  id: string;
  name: string;
  icon: ReactNode;
}

export interface LlmProvider extends Provider {
  models: { id: string; name: string }[];
}

export interface EmbeddingProviderUI extends Provider {
  models: { id: string; name: string; dimensions: number }[];
}

// ─── Build from @memlib/ai registries ────────────────────────────

export const CUSTOM_LLM_PROVIDER: LlmProvider = {
  id: "custom",
  name: "Custom (OpenAI-compatible)",
  icon: <ProviderLogo providerId="custom" />,
  models: [],
};

export const CUSTOM_EMBEDDING_PROVIDER: EmbeddingProviderUI = {
  id: "custom",
  name: "Custom (OpenAI-compatible)",
  icon: <ProviderLogo providerId="custom" />,
  models: [],
};

export const LLM_PROVIDERS: LlmProvider[] = [
  ...AI_LLM_PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    icon: <ProviderLogo providerId={p.id} />,
    models: p.models.map((m) => ({ id: m.id, name: m.name })),
  })),
  CUSTOM_LLM_PROVIDER,
];

export const EMBEDDING_PROVIDERS: EmbeddingProviderUI[] = [
  ...AI_EMBEDDING_PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    icon: <ProviderLogo providerId={p.id} />,
    models: p.models.map((m) => ({
      id: m.id,
      name: m.name,
      dimensions: m.dimensions,
    })),
  })),
  CUSTOM_EMBEDDING_PROVIDER,
];
