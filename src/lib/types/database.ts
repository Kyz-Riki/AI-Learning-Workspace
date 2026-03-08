export type WorkspaceStatus = "not_started" | "studying" | "mastered";

export interface SummaryTopic {
  topic: string;
  points: string[];
}

export interface QuizQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
}

export interface Workspace {
  id: string;
  user_id: string;
  title: string;
  file_url: string;
  summary_data: SummaryTopic[];
  quiz_data: QuizQuestion[];
  status: WorkspaceStatus;
  best_score: number;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: Workspace;
        Insert: Omit<Workspace, "id" | "created_at">;
        Update: Partial<Omit<Workspace, "id" | "created_at">>;
      };
    };
  };
}
