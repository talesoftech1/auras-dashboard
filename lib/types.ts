// Shape of a row in Supabase `bots` table.
// Keep in sync with migrations/002_dashboard_tables.sql.
export type Bot = {
  id: string;
  owner_user_id: string | null;
  company_name: string | null;
  trigger_keyword: string | null;
  website_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  system_prompt: string | null;
  system_prompt_source: "auto" | "manual" | null;
  status: "pending" | "active" | "paused" | "cancelled" | string;
  takeover_mode: boolean | null;
  takeover_until: string | null;
  created_at: string;
};

export type UnansweredQuestion = {
  id: string;
  bot_id: string;
  conversation_id: string | null;
  user_phone: string | null;
  question: string;
  asked_at: string;
  status: "open" | "resolved" | "ignored" | string;
  resolved_at: string | null;
  resolution_note: string | null;
};

export type DocumentRow = {
  id: string;
  bot_id: string;
  file_name: string;
  storage_path: string;
  extracted_text: string | null;
  uploaded_at: string;
};

export type Faq = {
  id: string;
  bot_id: string;
  question: string;
  answer: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  bot_id: string;
  user_phone: string;
  user_name: string | null;
  started_at: string;
  last_message_at: string;
  message_count: number;
  unread_for_owner: boolean;
  last_preview: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  direction: "user" | "bot" | "owner" | "system";
  body: string;
  wa_message_id: string | null;
  fully_answered: boolean | null;
  created_at: string;
};
