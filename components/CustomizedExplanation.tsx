"use client";

import { useEffect, useRef } from "react";
import type { KnowledgePoint, KnowledgeLevel } from "@/types";

interface CustomizedExplanationProps {
  content: string;
  knowledgePoints: KnowledgePoint[];
  selectedLevels: Record<number, KnowledgeLevel>;
  streamingText: string;
  isLoading: boolean;
  onComplete: () => void;
}

export default function CustomizedExplanation({
  content,
  knowledgePoints,
  selectedLevels,
  streamingText,
  isLoading,
  onComplete,
}: CustomizedExplanationProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && streamingText && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [isLoading, streamingText]);

  useEffect(() => {
    if (!isLoading && streamingText && streamingText.length > 0) {
      onComplete();
    }
  }, [isLoading, streamingText, onComplete]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <span>✨</span>
          正在生成个性化解析
        </h2>
        {isLoading && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-200"></div>
          </div>
        )}
      </div>

      <div
        ref={contentRef}
        className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed min-h-[300px] max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600"
      >
        {streamingText ? (
          <p className="mb-4 whitespace-pre-wrap typewriter-cursor">
            {streamingText}
          </p>
        ) : (
          <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500">
            <div className="text-center">
              <div className="text-4xl mb-3">🤖</div>
              <p>AI 正在为您准备...</p>
            </div>
          </div>
        )}
      </div>

      {!isLoading && streamingText && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            ⬆️ 回到顶部
          </button>
        </div>
      )}
    </div>
  );
}