import { useEffect, useMemo, useState } from "react";
import {
  getDeadlines, createDeadline, updateDeadline,
  deleteDeadline,
} from "../api/client";
import Card from "../components/Card";
import Badge from "../components/Badge";
import { Plus, Trash2, CheckCircle, Circle, X } from "lucide-react";

const TYPES = ["assignment", "project", "exam", "submission"];
const PRIORITIES = ["low", "medium", "high"];

const PRIORITY_WEIGHT = { low: 1, medium: 2, high: 3 };
const TYPE_BASE_BLOCKS = { assignment: 3, project: 5, exam: 6, submission: 2 };

const emptyForm = {
  title: "", type: "assignment", subject: "",
  due_date: "", description: "", priority: "medium",
  student_id: "default_student",
};

export default function Deadlines() {
  const [deadlines, setDeadlines] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
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

  const daysUntil = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    return diff;
  };

  const urgencyScore = (days) => {
    if (days < 0) return 12;
    if (days === 0) return 10;
    if (days <= 2) return 9;
    if (days <= 7) return 7;
    if (days <= 14) return 4;
    return 1;
  };

  const typeScore = (type) => {
    if (type === "exam") return 3;
    if (type === "project") return 2;
    return 1;
  };

  const getTaskScore = (deadline) => {
    const days = daysUntil(deadline.due_date);
    const priority = PRIORITY_WEIGHT[deadline.priority] || 2;
    return priority * 4 + urgencyScore(days) + typeScore(deadline.type);
  };

  const getRecommendedBlocks = (deadline) => {
    const days = daysUntil(deadline.due_date);
    const base = TYPE_BASE_BLOCKS[deadline.type] || 3;
    const priorityBonus = deadline.priority === "high" ? 2 : deadline.priority === "medium" ? 1 : 0;
    const urgencyBonus = days <= 2 ? 2 : days <= 7 ? 1 : 0;
    return Math.max(1, base + priorityBonus + urgencyBonus);
  };

  const activeDeadlines = useMemo(() => {
    return deadlines
      .filter((d) => !d.completed)
      .map((d) => {
        const days = daysUntil(d.due_date);
        const totalBlocks = getRecommendedBlocks(d);
        const availableDays = days <= 0 ? 1 : days;
        return {
          ...d,
          days,
          score: getTaskScore(d),
          totalBlocks,
          dailyBlocks: Math.max(1, Math.ceil(totalBlocks / availableDays)),
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.days - b.days;
      });
  }, [deadlines]);

  const todaysFocus = useMemo(() => activeDeadlines.slice(0, 3), [activeDeadlines]);

  const weeklyBuckets = useMemo(() => {
    return {
      critical: activeDeadlines.filter((d) => d.days <= 2),
      thisWeek: activeDeadlines.filter((d) => d.days > 2 && d.days <= 7),
      later: activeDeadlines.filter((d) => d.days > 7),
    };
  }, [activeDeadlines]);

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
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Deadline
        </button>
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
      {activeDeadlines.length > 0 && (
        <Card className="border-primary-500/30 bg-primary-500/5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="font-semibold text-white text-sm">Priority Study Plan</p>
              <p className="text-xs text-gray-400 mt-1">Auto-ranked by due date, priority, and task type</p>
            </div>
            <Badge label={`${activeDeadlines.length} active`} variant="assignment" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-3">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Today Focus (Next 24h)</p>
              <div className="space-y-2">
                {todaysFocus.map((d) => (
                  <div key={d.id} className="border border-gray-800 rounded-md p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white truncate">{d.title}</p>
                      <span className="text-xs text-primary-400">P{d.score}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {d.days < 0 ? `${Math.abs(d.days)} day(s) overdue` : d.days === 0 ? "Due today" : `${d.days} day(s) left`} •
                      {` ${d.dailyBlocks} block(s) today (${d.totalBlocks} total)`}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-3">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Weekly Load Split</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-gray-300">
                  <span>Critical (0-2 days)</span>
                  <span className="text-red-400 font-medium">{weeklyBuckets.critical.length}</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span>Upcoming (3-7 days)</span>
                  <span className="text-yellow-400 font-medium">{weeklyBuckets.thisWeek.length}</span>
                </div>
                <div className="flex items-center justify-between text-gray-300">
                  <span>Later (8+ days)</span>
                  <span className="text-green-400 font-medium">{weeklyBuckets.later.length}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-800 text-xs text-gray-400 leading-relaxed">
                  Rule: finish all critical tasks first, then allocate 70% effort to this-week tasks and 30% to later tasks.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Priority Queue</p>
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {activeDeadlines.map((d, index) => (
                <div key={d.id} className="bg-gray-900/70 border border-gray-800 rounded-md px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-500 w-5">#{index + 1}</span>
                      <p className="text-sm text-white truncate">{d.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge label={d.priority} variant={d.priority} />
                      <span className="text-xs text-primary-400">P{d.score}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {d.days < 0 ? `${Math.abs(d.days)} day(s) overdue` : d.days === 0 ? "Due today" : `${d.days} day(s) left`} •
                    {` Plan ${d.dailyBlocks} x 50-min block(s) per day`}
                  </p>
                </div>
              ))}
            </div>
          </div>
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
