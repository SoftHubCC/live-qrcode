export type TargetType = "qr" | "link" | "file";

export interface LiveCode {
  id: string;
  name: string;
  description: string;
  type: TargetType;
  created_at: string;
}

export interface Target {
  id: string;
  live_code_id: string;
  type: TargetType;
  value: string;
  image?: string;
  label: string;
  note: string;
  is_active: number;
  created_at: string;
}
