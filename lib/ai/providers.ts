import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: `${ollamaBaseUrl}/v1`,
});

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        "chat-model": ollama("qwen2.5:14b"),
        "chat-model-reasoning": wrapLanguageModel({
          model: ollama("qwen2.5:14b"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "title-model": ollama("qwen2.5:14b"),
        "artifact-model": ollama("qwen2.5-coder:14b"),
      },
    });
