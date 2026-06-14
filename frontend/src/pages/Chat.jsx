import { useState, useRef, useEffect } from "react";
import { chatQuery } from "../api/client";
import { Send, Bot, User, Loader2, FileText, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";

const SUGGESTED = [
  "What classes do I have today?",
  "What is my next class?",
  "Do I have any deadlines this week?",
  "Summarize today's notices.",
  "What topics are in Unit 3?",
  "When is my next assignment due?",
];

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm Campus Flow AI. Ask me anything about your schedule, deadlines, documents, or campus updates. 🎓",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const bottomRef = useRef();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    const question = text || input.trim();
    if (!question || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res = await chatQuery(question);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.answer,
          sources: res.data.sources || [],
        },
      ]);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.message || "unknown error";
      const isQuota = status === 429 || detail.toLowerCase().includes("quota") || detail.toLowerCase().includes("rate limit") || detail.toLowerCase().includes("429");
      const isServer = status >= 500 || (!status && detail.toLowerCase().includes("network"));
      let friendly;
      if (isQuota) {
        friendly = "⚠️ **Gemini API quota exceeded.** All API keys have hit the free-tier daily limit (20 req/day). Please wait until tomorrow or add a new API key in the backend `.env` file.";
      } else if (isServer) {
        friendly = `🔴 **Backend error (${status || 500}):** ${detail}\n\nCheck the backend terminal for the traceback and restart if needed.`;
      } else {
        friendly = `Error: ${detail}\n\nPlease check your connection and try again.`;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: friendly },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full min-h-0">
      <div className="mb-4 flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
          <p className="text-gray-400 text-sm mt-1">Ask about your schedule, deadlines, or documents</p>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg">
          <Clock size={13} className="text-primary-400" />
          <span className="text-xs text-gray-300 font-medium">
            {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
          <span className="text-xs text-primary-400 font-mono">
            {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hidden scroll-smooth pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              msg.role === "user" ? "bg-primary-600" : "bg-accent-500/20"
            }`}>
              {msg.role === "user" ? (
                <User size={15} className="text-white" />
              ) : (
                <Bot size={15} className="text-accent-400" />
              )}
            </div>
            <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary-600 text-white rounded-tr-sm"
                  : "bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-sm prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700"
              }`}>
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {msg.sources.map((s, si) => (
                    <span key={si} className="flex items-center gap-1 text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                      <FileText size={10} />
                      {s.filename || s.type} ({Math.round(s.score * 100)}%)
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center">
              <Bot size={15} className="text-accent-400" />
            </div>
            <div className="bg-gray-900 border border-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
              <Loader2 size={14} className="text-gray-500 animate-spin" />
              <span className="text-gray-500 text-sm">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {messages.length === 1 && (
        <div className="py-3 flex flex-wrap gap-2 shrink-0">
          {SUGGESTED.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full transition-colors border border-gray-700"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="pt-3 border-t border-gray-800 shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 focus-within:border-primary-500 transition-colors"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your schedule, deadlines, or documents…"
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white p-2 rounded-lg transition-colors"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
