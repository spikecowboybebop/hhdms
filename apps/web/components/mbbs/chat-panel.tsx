"use client";

import { useEffect, useState, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { chatApi, type ChatConversation, type ChatMessage } from "@/lib/chat-api";

interface ChatPanelProps {
  conversation: ChatConversation;
  currentUserId: string;
  onClose: () => void;
}

export default function ChatPanel({ conversation, currentUserId, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const otherName =
    conversation.doctor
      ? `${conversation.doctor.firstNameEn ?? ""} ${conversation.doctor.lastNameEn ?? ""}`.trim()
      : conversation.patient
        ? `${conversation.patient.first_name_en ?? ""} ${conversation.patient.last_name_en ?? ""}`.trim()
        : "Unknown";

  useEffect(() => {
    chatApi.getMessages(conversation.id).then(setMessages).catch(() => {});
  }, [conversation.id]);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";
    const socketUrl = apiUrl.replace(/\/+$/, "");
    let token = "";
    try {
      const raw = localStorage.getItem("hhdms.session");
      if (raw) token = JSON.parse(raw).token;
    } catch {}

    const socket = io(`${socketUrl}/chat`, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_chat", { conversationId: conversation.id });
      socket.emit("mark_read", { conversationId: conversation.id });
    });

    socket.on("new_message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      chatApi.markRead(conversation.id).catch(() => {});
    });

    socket.on("user_typing", (data: { conversationId: string }) => {
      if (data.conversationId === conversation.id) setOtherTyping(true);
    });

    socket.on("user_stop_typing", (data: { conversationId: string }) => {
      if (data.conversationId === conversation.id) setOtherTyping(false);
    });

    socket.on("messages_read", () => {});

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversation.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const content = input.trim();
    if (!content || !socketRef.current) return;
    socketRef.current.emit("send_message", { conversationId: conversation.id, content });
    setInput("");
    socketRef.current.emit("stop_typing", { conversationId: conversation.id });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (value: string) => {
    setInput(value);
    if (!socketRef.current) return;
    socketRef.current.emit("typing", { conversationId: conversation.id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("stop_typing", { conversationId: conversation.id });
    }, 2000);
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00D4B2]/10 text-[#00D4B2] text-sm font-bold">
            {otherName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#2D3A4A]">{otherName}</p>
            <p className="text-xs text-slate-400">
              {conversation.assignment?.appointment_activity ?? "active"}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                  isMe
                    ? "bg-[#00D4B2] text-white rounded-br-sm"
                    : "bg-white text-[#2D3A4A] border border-slate-200 rounded-bl-sm"
                }`}
              >
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMe ? "text-white/70" : "text-slate-400"}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white border border-slate-200 px-4 py-2 text-sm text-slate-400 rounded-bl-sm">
              Typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:border-[#00D4B2]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00D4B2] text-white hover:bg-[#00b89c] disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
