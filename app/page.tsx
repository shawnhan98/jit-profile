"use client";

import { useState, useRef, useEffect } from "react";
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

  // 调用后端 API - 提取知识点
  const extractKnowledgePoints = async (content: string): Promise<KnowledgePoint[]> => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "extract",
        content,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to extract knowledge points");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    try {
      const parsed = JSON.parse(fullText);
      return parsed.knowledge_points || [];
    } catch (e) {
      console.error("Failed to parse knowledge points:", e);
      const match = fullText.match(/"knowledge_points"\s*:\s*(\[[^\]]*\])/);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch {
          return [];
        }
      }
      return [];
    }
  };

  // 调用后端 API - 生成解释
  const generateExplanation = async (
    content: string,
    knowledgePoints: KnowledgePoint[],
    selectedLevels: Record<number, KnowledgeLevel>
  ): Promise<string> => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "explain",
        content,
        knowledgePoints,
        selectedLevels,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate explanation");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      setStreamingText((prev) => prev + chunk);
    }

    return fullText;
  };

  const handleStartAnalysis = async () => {
    if (!state.content.trim()) return;

    setIsLoading(true);
    try {
      const knowledgePoints = await extractKnowledgePoints(state.content);
      setState((prev) => ({
        ...prev,
        knowledgePoints,
        step: knowledgePoints.length > 0 ? "check" : "explanation",
      }));
    } catch (error) {
      console.error("Extraction failed:", error);
      alert("分析失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelSelect = async (index: number, level: KnowledgeLevel) => {
    setState((prev) => ({
      ...prev,
      selectedLevels: { ...prev.selectedLevels, [index]: level },
    }));

    const updatedLevels = { ...state.selectedLevels, [index]: level };
    const hasAllSelected = state.knowledgePoints.every(
      (_, i) => updatedLevels[i] !== undefined
    );
    const hasAnySkip = Object.values(updatedLevels).includes("skip");

    if (hasAllSelected || hasAnySkip) {
      setIsLoading(true);
      setState((prev) => ({ ...prev, step: "explanation" }));
      setStreamingText("");

      try {
        const fullText = await generateExplanation(
          state.content,
          state.knowledgePoints,
          updatedLevels
        );
        setIsLoading(false);
        setState((prev) => ({
          ...prev,
          explanation: fullText,
          step: "complete",
        }));
      } catch (error) {
        console.error("Generation failed:", error);
        alert("生成解析失败，请重试");
        setState((prev) => ({ ...prev, step: "check" }));
        setIsLoading(false);
      }
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