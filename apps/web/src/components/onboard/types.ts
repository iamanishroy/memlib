export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface OnboardingFormData {
  projectName: string;
  databaseUrl: string;
  embeddingProvider: string;
  embeddingApiKey: string;
  embeddingModel: string;
  embeddingBaseUrl: string;
  llmProvider: string;
  llmApiKey: string;
  llmModel: string;
  llmBaseUrl: string;
}
