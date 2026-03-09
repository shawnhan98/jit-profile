"use client";

import { useState, useRef, useEffect } from "react";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import AnalysisInput from "@/components/AnalysisInput";
import KnowledgeCheck from "@/components/KnowledgeCheck";
import CustomizedExplanation from "@/components/CustomizedExplanation";
import type { KnowledgeLevel, KnowledgePoint, AnalysisState } from "@/types";

const DEFAULT_STATE: AnalysisState = {
  content: "",
  knowledgePoints: [],
  selectedLevels: {},
  explanation: "",
  step: "input",
};

export default function HomePage() {
  const [state, setState] = useState<AnalysisState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const explanationRef = useRef<HTMLDivElement>(null);

  const openai = createOpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  });

  const extractKnowledgePoints = async (content: string) => {
    const result = await streamText({
      model: openai.chat("gpt-4o-mini"),
      prompt: `请分析以下内容，提取1-2个最重要的前置知识点或概念。内容：${content}`,
      system: `你是一个专业的学习分析助手。请从用户提供的内容中，识别出理解该内容所必需的最关键的1-2个前置知识点或概念。

输出格式要求（严格JSON）：
{
  "knowledge_points": [
    {
      "term": "知识点名称",
      "definition": "简短清晰的定义，30字以内"
    }
  ]
}

要求：
1. 选择真正前置、基础的概念
2. 定义要简洁易懂
3. 只返回JSON，不要其他文本`,
    });

    let fullText = "";
    for await (const chunk of result.textStream) {
      fullText += chunk;
    }

    try {
      const parsed = JSON.parse(fullText);
      return parsed.knowledge_points || [];
    } catch (e) {
      console.error("Failed to parse knowledge points:", e);
      // Fallback: try to extract any array
      const match = fullText.match(/"knowledge_points"\s*:\s*(\[[^\]]*\])/);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch (e2) {
          return [];
        }
      }
      return [];
    }
  };

  const generateExplanation = async (
    content: string,
    knowledgePoints: KnowledgePoint[],
    selectedLevels: Record<number, KnowledgeLevel>
  ) => {
    const levels = ["未知", "听过", "掌握", "跳过"];
    const levelDescs = [
      "完全陌生，需要最基础的解释，使用大量类比和实例",
      "大概听过，需要温和的讲解，适当补充背景",
      "了如指掌，可以直接进入核心内容，侧重深度和应用",
      "跳过此知识点，直接分析主要内容",
    ];

    const prompt = knowledgePoints
      .map((kp, idx) => {
        const level = selectedLevels[idx] || "unknown";
        const levelDesc = levelDescs[["unknown", "familiar", "mastered", "skip"].indexOf(level)];
        return `知识点：${kp.term}（${kp.definition}）- 用户掌握程度：${levels[["unknown", "familiar", "mastered", "skip"].indexOf(level)]}，需要${levelDesc}`;
      })
      .join("\n");

    const result = await streamText({
      model: openai.chat("gpt-4o-mini"),
      prompt: `请根据以下信息，为用户生成个性化的内容解析：\n\n原始内容：${content}\n\n知识点评估：\n${prompt}\n\n请生成一个完整的解析，包括：\n1. 简短的导入（如果需要）\n2. 针对每个知识点，根据用户掌握程度调整讲解深度和方式\n3. 对原始内容的分析和解读\n\n要求：\n- 语言亲切自然，像老师在对学生讲解\n- 对掌握程度低的知识点多用类比和实例\n- 对掌握程度高的直接深入\n- 跳过的知识点简单带过或不讲\n- 整体流畅易读，适当分段`,
      system: `你是一个因材施教的教学专家。根据用户对不同前置知识的掌握程度，动态调整你的讲解风格和深度。目标是让每个用户都能以最适合自己的方式理解内容。`,
    });

    for await (const chunk of result.textStream) {
      setStreamingText((prev) => prev + chunk);
    }
  };

  const handleStartAnalysis = async () => {
    if (!state.content.trim()) return;

    setIsLoading(true);
    setState((prev) => ({ ...prev, step: "check" }));
    setIsLoading(false);

    const knowledgePoints = await extractKnowledgePoints(state.content);
    setState((prev) => ({
      ...prev,
      knowledgePoints,
      step: knowledgePoints.length > 0 ? "check" : "explanation",
    }));
  };

  const handleLevelSelect = async (index: number, level: KnowledgeLevel) => {
    setState((prev) => ({
      ...prev,
      selectedLevels: { ...prev.selectedLevels, [index]: level },
    }));

    // If all checked or skip selected, proceed
    const updatedLevels = { ...state.selectedLevels, [index]: level };
    const hasAllSelected = state.knowledgePoints.every(
      (_, i) => updatedLevels[i] !== undefined
    );
    const hasAnySkip = Object.values(updatedLevels).includes("skip");

    if (hasAllSelected || hasAnySkip) {
      setIsLoading(true);
      setState((prev) => ({ ...prev, step: "explanation" }));
      setStreamingText("");

      await generateExplanation(
        state.content,
        state.knowledgePoints,
        updatedLevels
      );

      setIsLoading(false);
      setState((prev) => ({ ...prev, explanation: streamingText, step: "complete" }));
    }
  };

  const handleReset = () => {
    setState(DEFAULT_STATE);
    setStreamingText("");
    if (explanationRef.current) {
      explanationRef.current.scrollTop = 0;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
            即时微型画像
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            AI 驱动的个性化学习分析
          </p>
        </header>

        {state.step === "input" && (
          <AnalysisInput
            content={state.content}
            onContentChange={(content) =>
              setState((prev) => ({ ...prev, content }))
            }
            onStart={handleStartAnalysis}
            isLoading={isLoading}
          />
        )}

        {state.step === "check" && (
          <KnowledgeCheck
            knowledgePoints={state.knowledgePoints}
            selectedLevels={state.selectedLevels}
            onLevelSelect={handleLevelSelect}
            onBack={() => setState((prev) => ({ ...prev, step: "input" }))}
          />
        )}

        {state.step === "explanation" && (
          <CustomizedExplanation
            content={state.content}
            knowledgePoints={state.knowledgePoints}
            selectedLevels={state.selectedLevels}
            streamingText={streamingText}
            isLoading={isLoading}
            onComplete={() =>
              setState((prev) => ({ ...prev, step: "complete" }))
            }
          />
        )}

        {state.step === "complete" && (
          <div className="space-y-6 animate-slide-up">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                  📚 知识点回顾
                </h2>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  分析新内容
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {state.knowledgePoints.map((kp, idx) => {
                  const level = state.selectedLevels[idx];
                  const levelLabels = {
                    unknown: "❌ 完全陌生",
                    familiar: "🤔 大概听过",
                    mastered: "✅ 了如指掌",
                    skip: "⏭️ 跳过",
                  };
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl"
                    >
                      <div className="text-xl">{levelLabels[level]?.split(" ")[0]}</div>
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {kp.term}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {kp.definition}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          {levelLabels[level]?.split(" ").slice(1).join(" ")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
                  🎯 定制化解析
                </h3>
                <div
                  ref={explanationRef}
                  className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed overflow-y-auto max-h-[50vh] pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600"
                >
                  {state.explanation.split("\n").map((paragraph, idx) => (
                    <p key={idx} className="mb-3 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}