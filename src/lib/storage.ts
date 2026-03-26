import { SavedWorkflow } from "./types";

const STORAGE_KEY = "content_pipeline_history";

export function loadHistory(): SavedWorkflow[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveToHistory(workflow: SavedWorkflow) {
  if (typeof window === "undefined") return;
  const current = loadHistory();
  const updated = [workflow, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
