"use client";

import type { KnowledgePoint, KnowledgeLevel } from "@/types";

interface KnowledgeCheckProps {
  knowledgePoints: KnowledgePoint[];
  selectedLevels: Record<number, KnowledgeLevel>;
  onLevelSelect: (index: number, level: KnowledgeLevel) => void;
  onBack: () => void;
}

const levelOptions: { value: KnowledgeLevel; label: string; emoji: string; description: string }[] = [
  { value: "unknown", label: "完全陌生", emoji: "❌", description: "需要最基础的讲解，大量类比" },
  { value: "familiar", label: "大概听过", emoji: "🤔", description: "需要温和讲解，补充背景" },
  { value: "mastered", label: "了如指掌", emoji: "✅", description: "直接深入核心内容" },
  { value: "skip", label: "跳过", emoji: "⏭️", description: "不讲解此知识点" },
];

export default function KnowledgeCheck({
  knowledgePoints,
  selectedLevels,
  onLevelSelect,
  onBack,
}: KnowledgeCheckProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <span>←</span>
          <span>返回</span>
        </button>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
          评估您的掌握程度
        </h2>
        <div className="w-20"></div>
      </div>

      <div className="space-y-4">
        {knowledgePoints.map((kp, index) => (
          <div
            key={index}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5 animate-slide-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="mb-4">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                知识点 {index + 1}
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                {kp.term}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                {kp.definition}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {levelOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onLevelSelect(index, option.value)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                    selectedLevels[index] === option.value
                      ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 scale-105"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <span
                    className={`font-semibold ${
                      selectedLevels[index] === option.value
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-slate-500 dark:text-slate-400 text-sm">
        <p>选择后 AI 将生成为您量身定制的解析</p>
        <p className="text-xs mt-1 opacity-70">所有知识点均可选择&ldquo;跳过&rdquo;</p>
      </div>
    </div>
  );
}