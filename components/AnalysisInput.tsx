"use client";

interface AnalysisInputProps {
  content: string;
  onContentChange: (content: string) => void;
  onStart: () => void;
  isLoading: boolean;
}

export default function AnalysisInput({
  content,
  onContentChange,
  onStart,
  isLoading,
}: AnalysisInputProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
        输入需要分析的内容
      </h2>

      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="请粘贴文章、笔记或任何需要学习的内容..."
        className="w-full h-48 p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-base"
        disabled={isLoading}
      />

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {content.length} 字符
        </div>
        <button
          onClick={onStart}
          disabled={!content.trim() || isLoading}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-full shadow-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 transition-all duration-200"
        >
          {isLoading ? "分析中..." : "开始分析"}
        </button>
      </div>

      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center">
        AI 将自动提取关键知识点并为您定制学习路径
      </p>
    </div>
  );
}