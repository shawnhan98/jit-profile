import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

// 创建智谱 AI 客户端（OpenAI 兼容接口）
export const createZhipuAI = () => {
  return createOpenAI({
    apiKey: process.env.ZHIPU_API_KEY, // 智谱 API Key
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
  });
};