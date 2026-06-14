import { useEffect, useState } from "react";
import {
  getDeadlines, createDeadline, updateDeadline,
  deleteDeadline, getStudySuggestions,
} from "../api/client";
import Card from "../components/Card";
import Badge from "../components/Badge";
import { Plus, Trash2, CheckCircle, Circle, Sparkles, X } from "lucide-react";

const TYPES = ["assignment", "project", "exam", "submission"];
const PRIORITIES = ["low", "medium", "high"];

const emptyForm = {
  title: "", type: "assignment", subject: "",
  due_date: "", description: "", priority: "medium",
  student_id: "default_student",
};

export default function Deadlines() {
  const [deadlines, setDeadlines] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [suggestions, setSuggestions] = useState("");
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDeadlines = () => {
    getDeadlines()
      .then((r) => setDeadlines(r.data.deadlines || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDeadlines(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createDeadline(form);
    setForm(emptyForm);
    setShowForm(false);
    fetchDeadlines();
  };

  const toggleComplete = async (d) => {
    await updateDeadline(d.id, { completed: !d.completed });
    fetchDeadlines();
  };

  const handleDelete = async (id) => {
    await deleteDeadline(id);
    fetchDeadlines();
  };

  const handleSuggestions = async () => {
    setLoadingSugg(true);
    setSuggestions("");
    try {
      const res = await getStudySuggestions();
      setSuggestions(res.data.suggestions);
    } finally {
      setLoadingSugg(false);
    }
  };

  const daysUntil = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    return diff;
  };

  const urgencyColor = (d) => {
    if (d.completed) return "opacity-50";
    const days = daysUntil(d.due_date);
    if (days < 0) return "border-l-4 border-red-600";
    if (days <= 2) return "border-l-4 border-red-500";
    if (days <= 7) return "border-l-4 border-yellow-500";
    return "border-l-4 border-green-600";
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Deadlines</h1>
          <p className="text-gray-400 text-sm mt-1">Assignments, exams, and submission dates</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSuggestions}
            disabled={loadingSugg}
            className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Sparkles size={15} />
            {loadingSugg ? "Generating…" : "Study Plan"}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Add Deadline
          </button>
        </div>
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">New Deadline</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                required
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                >
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                >
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <input
                placeholder="Subject (optional)"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              />
              <input
                required
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
              />
              <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500 resize-none"
              />
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg text-sm font-medium">
                  Add Deadline
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Study Suggestions */}
      {suggestions && (
        <Card className="border-accent-500/30 bg-accent-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-accent-500" />
            <p className="font-semibold text-white text-sm">AI Study Plan</p>
          </div>
          <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{suggestions}</p>
        </Card>
      )}

      {/* Deadlines list */}
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : deadlines.length === 0 ? (
        <Card className="text-center py-12">
          <CheckCircle size={36} className="text-gray-700 mx-auto mb-2" />
          <p className="text-gray-500">No deadlines added yet.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {deadlines.map((d) => {
            const days = daysUntil(d.due_date);
            return (
              <Card key={d.id} className={`flex items-center gap-3 ${urgencyColor(d)}`}>
                <button onClick={() => toggleComplete(d)} className="shrink-0">
                  {d.completed ? (
                    <CheckCircle size={20} className="text-green-500" />
                  ) : (
                    <Circle size={20} className="text-gray-600 hover:text-primary-500 transition-colors" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-medium ${d.completed ? "line-through text-gray-500" : "text-white"}`}>
                      {d.title}
                    </p>
                    <Badge label={d.type} variant={d.type} />
                    <Badge label={d.priority} variant={d.priority} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {d.subject && <span className="text-xs text-gray-500">{d.subject}</span>}
                    <span className="text-xs text-gray-500">Due: {d.due_date}</span>
                    {!d.completed && (
                      <span className={`text-xs font-medium ${days < 0 ? "text-red-400" : days <= 2 ? "text-red-400" : days <= 7 ? "text-yellow-400" : "text-green-400"}`}>
                        {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today!" : `${days}d left`}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="shrink-0 text-gray-700 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
