import { useEffect, useState, useRef } from "react";
import { getSummaries, uploadNotice, uploadDocument, deleteSummary } from "../api/client";
import Card from "../components/Card";
import { FileText, ChevronDown, ChevronUp, UtensilsCrossed, BookOpen, Bell, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

const ACCEPT = ".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.png,.jpg,.jpeg,.json,.txt";

const getMealTimingFromSummary = (summary, mealName, defaultTiming) => {
  if (!summary) return defaultTiming;
  const lines = summary.split("\n");
  for (const line of lines) {
    if (new RegExp("\\b" + mealName + "\\b", "i").test(line)) {
      const timePat = "\\b\\d{1,2}(?::\\d{2})?\\s*(?:AM|PM|am|pm)?\\b";
      const rangeRegex = new RegExp("(" + timePat + ")\\s*[-–to]+\\s*(" + timePat + ")", "i");
      const rangeMatch = line.match(rangeRegex);
      if (rangeMatch) {
        let startStr = rangeMatch[1].trim();
        let endStr = rangeMatch[2].trim();
        if (/am/i.test(endStr) && !/am|pm/i.test(startStr)) startStr += " AM";
        if (/pm/i.test(endStr) && !/am|pm/i.test(startStr)) startStr += " PM";
        return `${startStr} - ${endStr}`;
      }
      
      const singleRegex = new RegExp("(" + timePat + ")", "i");
      const singleMatch = line.match(singleRegex);
      if (singleMatch) {
        return singleMatch[1].trim();
      }
    }
  }
  return defaultTiming;
};

export default function Documents() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null); // "notice" | "doc" | "mess"
  const [msg, setMsg] = useState({ text: "", ok: true });
  const [expanded, setExpanded] = useState({});
  const [showMess, setShowMess] = useState(false);

  const noticeRef = useRef();
  const docRef = useRef();
  const messRef = useRef();

  const fetchSummaries = () => {
    getSummaries()
      .then((r) => setSummaries(r.data.summaries || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSummaries(); }, []);

  const showMsg = (text, ok = true) => setMsg({ text, ok });

  const handleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setUploadingId(type);
    setMsg({ text: "", ok: true });

    const fd = new FormData();
    fd.append("file", file);
    fd.append("student_id", "default_student");

    try {
      if (type === "notice") {
        fd.append("title", file.name.replace(/\.[^/.]+$/, ""));
        await uploadNotice(fd);
        showMsg("✓ Notice uploaded and summarized!");
        fetchSummaries();
      } else if (type === "mess") {
        fd.append("title", `Mess Menu — ${file.name.replace(/\.[^/.]+$/, "")}`);
        await uploadNotice(fd);
        showMsg("✓ Mess menu uploaded and summarized!");
        fetchSummaries();
      } else {
        fd.append("doc_type", "academic");
        await uploadDocument(fd);
        showMsg("✓ Document indexed for Q&A!");
      }
    } catch (err) {
      showMsg(`✗ Upload failed: ${err?.response?.data?.detail || err.message}`, false);
    } finally {
      setUploadingId(null);
    }
  };

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const handleDelete = async (id) => {
    try {
      await deleteSummary(id);
      setSummaries((prev) => prev.filter((s) => s.id !== id));
    } catch {
      showMsg("✗ Delete failed.", false);
    }
  };

  // All hidden inputs live outside cards to avoid event bubbling issues
  const inputs = (
    <>
      <input ref={noticeRef} id="notice-input" type="file" accept={ACCEPT} className="hidden" onChange={(e) => handleUpload(e, "notice")} />
      <input ref={docRef}    id="doc-input"    type="file" accept={ACCEPT} className="hidden" onChange={(e) => handleUpload(e, "doc")} />
      <input ref={messRef}   id="mess-input"   type="file" accept={ACCEPT} className="hidden" onChange={(e) => handleUpload(e, "mess")} />
    </>
  );

  const UploadCard = ({ id, icon: Icon, iconColor, borderColor, title, subtitle, busy }) => (
    <label
      htmlFor={id}
      className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors
        bg-gray-900 ${borderColor} text-center select-none
        ${busy ? "opacity-60 pointer-events-none" : "hover:bg-gray-800"}`}
    >
      {busy ? (
        <div className="w-7 h-7 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
      ) : (
        <Icon size={28} className={iconColor} />
      )}
      <p className="font-semibold text-white text-sm">{busy ? "Processing…" : title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </label>
  );

  return (
    <div className="space-y-6 w-full">
      {inputs}

      <div>
        <h1 className="text-2xl font-bold text-white">Documents</h1>
        <p className="text-gray-400 text-sm mt-1">Upload notices, mess menu, and academic documents</p>
      </div>

      {/* Upload grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UploadCard
          id="notice-input"
          icon={Bell}
          iconColor="text-primary-500"
          borderColor="border-gray-700 hover:border-primary-600"
          title="Notice / Circular"
          subtitle="PDF, DOCX, TXT, XLSX, JPG, PNG — AI summarized"
          busy={uploadingId === "notice"}
        />
        <UploadCard
          id="mess-input"
          icon={UtensilsCrossed}
          iconColor="text-green-400"
          borderColor="border-gray-700 hover:border-green-600"
          title="Mess Menu"
          subtitle="Upload weekly/daily mess menu — AI summarized"
          busy={uploadingId === "mess"}
        />
        <UploadCard
          id="doc-input"
          icon={BookOpen}
          iconColor="text-accent-500"
          borderColor="border-gray-700 hover:border-accent-500"
          title="Academic Document"
          subtitle="Syllabus, Notes, Lab manuals — indexed for Q&A"
          busy={uploadingId === "doc"}
        />
      </div>

      {msg.text && (
        <div className={`px-4 py-2 rounded-lg text-sm ${msg.ok ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}>
          {msg.text}
        </div>
      )}

      {/* Mess Menu Section */}
      {(() => {
        const messItems = summaries.filter((s) => s.title?.toLowerCase().includes("mess"));
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed size={18} className="text-green-400" />
                <h2 className="text-lg font-semibold text-white">Mess Menu</h2>
                {messItems.length > 0 && (
                  <span className="text-xs bg-green-900/50 text-green-400 border border-green-800 px-2 py-0.5 rounded-full">
                    {messItems.length} uploaded
                  </span>
                )}
              </div>
              {messItems.length > 0 && (
                <button
                  onClick={() => setShowMess((v) => !v)}
                  className="flex items-center gap-2 bg-green-900/30 hover:bg-green-900/50 border border-green-800 text-green-400 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  <UtensilsCrossed size={14} />
                  {showMess ? "Hide Mess Menu" : "Show Mess Menu"}
                </button>
              )}
            </div>

            {/* Only show content if toggled on AND items exist */}
            {showMess && messItems.length > 0 && (
              <div className="space-y-3">
                {messItems.map((s) => (
                  <Card key={s.id} className="border-green-900/40 bg-green-950/10">
                    <div className="flex items-center gap-2 mb-3">
                      <UtensilsCrossed size={14} className="text-green-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white truncate">{s.title}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(s.uploaded_at).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <button onClick={() => handleDelete(s.id)} className="shrink-0 text-gray-700 hover:text-red-400 transition-colors p-1">
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs bg-green-950/40 border border-green-900/30 px-3 py-2 rounded-lg text-green-300">
                      <span className="font-semibold text-white">Meal Timings:</span>
                      <span>🍳 Breakfast: {getMealTimingFromSummary(s.summary, "Breakfast", "08:00 AM - 09:30 AM")}</span>
                      <span>🍛 Lunch: {getMealTimingFromSummary(s.summary, "Lunch", "01:00 PM - 02:30 PM")}</span>
                      <span>🍽️ Dinner: {getMealTimingFromSummary(s.summary, "Dinner", "12:07 AM")}</span>
                    </div>

                    <div className="text-sm text-gray-200 border-t border-green-900/40 pt-3">
                      <div className="space-y-3">
                        <ReactMarkdown
                          components={{
                            p: ({node, ...props}) => <p className="whitespace-pre-wrap m-0" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />
                          }}
                        >
                          {s.summary}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* No mess menu uploaded yet — just show empty state, no placeholder text */}
            {messItems.length === 0 && !loading && (
              <Card className="text-center py-8 border-dashed border-green-900/40">
                <UtensilsCrossed size={32} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No mess menu uploaded yet.</p>
              </Card>
            )}
          </div>
        );
      })()}

      {/* Notices Section — only renders when there are actual notices */}
      {(() => {
        const noticeItems = summaries.filter((s) => !s.title?.toLowerCase().includes("mess"));
        if (loading || noticeItems.length === 0) return null;
        return (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bell size={18} className="text-primary-400" />
              <h2 className="text-lg font-semibold text-white">Notices & Circulars</h2>
              <span className="text-xs bg-primary-900/50 text-primary-400 border border-primary-800/50 px-2 py-0.5 rounded-full">
                {noticeItems.length}
              </span>
            </div>
            <div className="space-y-3">
              {noticeItems.map((s) => (
                <Card key={s.id}>
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => toggle(s.id)}>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Bell size={14} className="text-primary-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{s.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(s.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                        className="text-gray-700 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 size={15} />
                      </button>
                      {expanded[s.id] ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                    </div>
                  </div>
                  {expanded[s.id] && (
                    <div className="mt-3 text-sm text-gray-300 border-t border-gray-800 pt-3">
                      <div className="space-y-3">
                        <ReactMarkdown
                          components={{
                            p: ({node, ...props}) => <p className="whitespace-pre-wrap m-0" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />
                          }}
                        >
                          {s.summary}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {!expanded[s.id] && (
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2 leading-relaxed">
                      {s.summary.replace(/\*\*/g, '')}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
