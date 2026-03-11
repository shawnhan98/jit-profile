"use client";

import { useState, useRef } from "react";
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

function parseApiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  const rawMessage = error.message || fallback;
  const statusMatch = rawMessage.match(/API request failed:\s*(\d{3})\s*-/);
  const status = statusMatch ? Number(statusMatch[1]) : undefined;
  const jsonMatch = rawMessage.match(/\{[\s\S]*\}$/);

  let serverMessage = "";
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      serverMessage = parsed.error || parsed.message || "";
    } catch {
      serverMessage = "";
    }
  }

  const combined = `${rawMessage} ${serverMessage}`;

  if (
    status === 401 ||
    combined.includes("401") ||
    combined.includes("Unauthorized") ||
    combined.includes("无效") ||
    combined.includes("已过期")
  ) {
    return "当前服务端配置的智谱 API Key 无效或已过期，需要先更新后端配置。";
  }

  if (
    status === 429 ||
    combined.includes("429") ||
    combined.includes("Too Many Requests") ||
    combined.includes("速率限制")
  ) {
    return "智谱接口当前较忙，已触发限流。请稍等 10～30 秒后重试。";
  }

  if (
    status === 504 ||
    combined.includes("504") ||
    combined.includes("超时") ||
    combined.includes("timeout")
  ) {
    return "AI 响应有点慢，这次请求已超时。可以直接再试一次，通常下一次会恢复。";
  }

  return serverMessage || rawMessage || fallback;
}

// 解析 SSE 流，提取文本内容
async function readSSEText(response: Response): Promise<string> {
  // 检查响应状态
  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  
  // 如果不是流式响应，直接返回文本
  if (!contentType.includes("text/event-stream")) {
    return await response.text();
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No reader available");

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // 处理 buffer 中的行
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // 保留不完整的行
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      
      const data = trimmed.slice(6); // 去掉 "data: " 前缀
      
      if (data === "[DONE]") continue;
      
      try {
        const parsed = JSON.parse(data);
        // AI SDK 的 toAIStream 格式：{ type: "text-delta", textDelta: "..." }
        if (parsed.type === "text-delta" && parsed.textDelta) {
          fullText += parsed.textDelta;
        } else if (parsed.choices?.[0]?.delta?.content) {
          // 智谱 API 原生格式
          fullText += parsed.choices[0].delta.content;
        } else if (parsed.error) {
          throw new Error(parsed.error.message || "API error");
        }
      } catch {
        // 如果不是 JSON，可能是原始文本行（备用）
        if (data) {
          fullText += data;
        }
      }
    }
  }
  
  return fullText;
}

export default function HomePage() {
  const [state, setState] = useState<AnalysisState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [helperMessage, setHelperMessage] = useState<string | null>(
    "高峰期可能遇到限流或超时，系统会尽快给出明确提示。"
  );
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
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Failed to extract knowledge points");
    }

    const fullText = await readSSEText(response);

    try {
      const parsed = JSON.parse(fullText);
      return parsed.knowledge_points || [];
    } catch (e) {
      console.error("Failed to parse knowledge points:", e);
      // 尝试直接提取 JSON 数组（不使用 /s 标志）
      const match = fullText.match(/"knowledge_points"\s*:\s*(\[[\s\S]*?\])/);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch {
          return [];
        }
      }
      // 尝试提取整个 JSON 对象（备用方案）
      const objMatch = fullText.match(/\{[\s\S]*"knowledge_points"[\s\S]*\}/);
      if (objMatch) {
        try {
          const parsed = JSON.parse(objMatch[0]);
          return parsed.knowledge_points || [];
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
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate explanation");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const decoder = new TextDecoder();
    let fullText = "";
    const contentType = response.headers.get("content-type") || "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // 纯文本流：直接追加
      if (!contentType.includes("text/event-stream")) {
        fullText += chunk;
        setStreamingText((prev) => prev + chunk);
        continue;
      }

      // SSE 流：按 data 行解析
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "text-delta" && parsed.textDelta) {
            fullText += parsed.textDelta;
            setStreamingText((prev) => prev + parsed.textDelta);
          } else if (parsed.choices?.[0]?.delta?.content) {
            fullText += parsed.choices[0].delta.content;
            setStreamingText((prev) => prev + parsed.choices[0].delta.content);
          }
        } catch {
          if (data) {
            fullText += data;
            setStreamingText((prev) => prev + data);
          }
        }
      }
    }

    return fullText.trim();
  };

  const handleStartAnalysis = async () => {
    if (!state.content.trim()) return;

    setErrorMessage(null);
    setHelperMessage("正在提取关键知识点，通常需要几秒钟。");
    setIsLoading(true);
    try {
      const knowledgePoints = await extractKnowledgePoints(state.content);
      setState((prev) => ({
        ...prev,
        knowledgePoints,
        step: knowledgePoints.length > 0 ? "check" : "explanation",
      }));
      setHelperMessage(
        knowledgePoints.length > 0
          ? "请标记你对这些知识点的掌握程度，我会立刻生成定制化解析。"
          : "这段内容不需要额外前置知识点，正在直接生成解析。"
      );
    } catch (error) {
      console.error("Extraction failed:", error);
      setErrorMessage(
        parseApiErrorMessage(error, "分析失败，请稍后重试。")
      );
      setHelperMessage("你可以直接点击“开始分析”再次尝试。");
    } finally {
      setIsLoading(false);
    }
  };

  const startExplanation = async (
    selectedLevels: Record<number, KnowledgeLevel>
  ) => {
    setErrorMessage(null);
    setHelperMessage("正在生成个性化解析，若高峰期较慢会自动给出明确提示。");
    setIsLoading(true);
    setState((prev) => ({ ...prev, step: "explanation" }));
    setStreamingText("");

    try {
      const fullText = await generateExplanation(
        state.content,
        state.knowledgePoints,
        selectedLevels
      );
      setState((prev) => ({
        ...prev,
        explanation: fullText,
        step: "complete",
      }));
      setHelperMessage(null);
    } catch (error) {
      console.error("Generation failed:", error);
      setErrorMessage(
        parseApiErrorMessage(error, "生成解析失败，请稍后重试。")
      );
      setHelperMessage("你可以直接重试一次，或返回调整知识点掌握程度。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelSelect = async (index: number, level: KnowledgeLevel) => {
    setErrorMessage(null);
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
      await startExplanation(updatedLevels);
    }
  };

  const handleRetryExplanation = async () => {
    await startExplanation(state.selectedLevels);
  };

  const handleReset = () => {
    setState(DEFAULT_STATE);
    setStreamingText("");
    setErrorMessage(null);
    setHelperMessage("高峰期可能遇到限流或超时，系统会尽快给出明确提示。");
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
            onContentChange={(content) => {
              setErrorMessage(null);
              setHelperMessage("高峰期可能遇到限流或超时，系统会尽快给出明确提示。");
              setState((prev) => ({ ...prev, content }));
            }}
            onStart={handleStartAnalysis}
            isLoading={isLoading}
            errorMessage={errorMessage}
            helperMessage={!errorMessage ? helperMessage : null}
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
            errorMessage={errorMessage}
            helperMessage={!errorMessage ? helperMessage : null}
            onRetry={handleRetryExplanation}
            onBack={() => {
              setErrorMessage(null);
              setHelperMessage("你可以调整知识点掌握程度后重新生成。")
              setState((prev) => ({ ...prev, step: "check" }));
            }}
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