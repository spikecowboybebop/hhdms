const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";

function getHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("hhdms.session");
    if (!raw) return {};
    const session = JSON.parse(raw);
    return { Authorization: `Bearer ${session.token}` };
  } catch {
    return {};
  }
}

export interface ChatConversation {
  id: string;
  assignment_id: string;
  doctor_id: string;
  patient_id: string;
  created_at: string | null;
  updated_at: string | null;
  assignment: { appointment_activity: string | null; patient_consent: string | null } | null;
  doctor: { id: string; firstNameEn: string | null; lastNameEn: string | null } | null;
  patient: { id: string; first_name_en: string | null; last_name_en: string | null } | null;
  messages: { id: string; content: string; sender_id: string; created_at: string | null; read: boolean }[];
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string | null;
}

export interface UnreadCount {
  conversationId: string;
  unreadCount: number;
}

export const chatApi = {
  async getConversations(): Promise<ChatConversation[]> {
    const res = await fetch(`${API_URL}/chat/conversations`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to load conversations");
    return res.json();
  },

  async getUnreadCounts(): Promise<UnreadCount[]> {
    const res = await fetch(`${API_URL}/chat/unread`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to load unread counts");
    return res.json();
  },

  async getOrCreateConversation(assignmentId: string): Promise<ChatConversation> {
    const res = await fetch(`${API_URL}/chat/conversation/${assignmentId}`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to create conversation");
    return res.json();
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const res = await fetch(`${API_URL}/chat/${conversationId}/messages`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to load messages");
    return res.json();
  },

  async sendMessage(conversationId: string, content: string): Promise<ChatMessage> {
    const res = await fetch(`${API_URL}/chat/${conversationId}/messages`, {
      method: "POST",
      headers: { ...getHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("Failed to send message");
    return res.json();
  },

  async markRead(conversationId: string): Promise<void> {
    await fetch(`${API_URL}/chat/${conversationId}/read`, {
      method: "POST",
      headers: getHeaders(),
    });
  },

  async startChat(): Promise<ChatConversation> {
    const res = await fetch(`${API_URL}/chat/start`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to start chat");
    return res.json();
  },
};
