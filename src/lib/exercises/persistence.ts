export interface PracticeSaveRow {
  session_id: string;
  revision: number;
  session_score: number;
  answer_count: number;
  status: string;
}

export interface PracticeRpcResult {
  data: PracticeSaveRow[] | null;
  error: { code: string; message: string } | null;
}

export interface PracticeRpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<PracticeRpcResult>;
}

/** Calls rpc as an object method so Supabase retains its internal `this.rest`. */
export function savePracticeAnswer(client: PracticeRpcClient, args: Record<string, unknown>) {
  return client.rpc("save_practice_answer", args);
}

