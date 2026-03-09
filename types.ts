export type KnowledgeLevel = "unknown" | "familiar" | "mastered" | "skip";

export interface KnowledgePoint {
  term: string;
  definition: string;
}

export interface AnalysisState {
  content: string;
  knowledgePoints: KnowledgePoint[];
  selectedLevels: Record<number, KnowledgeLevel>;
  explanation: string;
  step: "input" | "check" | "explanation" | "complete";
}