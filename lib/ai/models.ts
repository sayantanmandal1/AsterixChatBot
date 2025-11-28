export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Qwen 2.5",
    description: "Local model for general chat and text generation",
  },
  {
    id: "chat-model-reasoning",
    name: "Qwen 2.5 Reasoning",
    description:
      "Uses advanced chain-of-thought reasoning for complex problems",
  },
];
