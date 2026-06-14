import { useEffect, useState, useRef } from "react";
import { getWeekly, getNextClass, uploadTimetable, clearTimetable } from "../api/client";
import Card from "../components/Card";
import { Upload, Clock, ChevronRight, Trash2 } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Timetable() {
  const [weekly, setWeekly] = useState({});
  const [nextClass, setNextClass] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef();

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const fetchData = () => {
    getWeekly().then((r) => setWeekly(r.data.weekly_schedule || {}));
    getNextClass().then((r) => setNextClass(r.data.next_class));
  };

  useEffect(() => { fetchData(); }, []);

  // Reset confirm state after 3 seconds of inactivity
  useEffect(() => {
    if (!confirmClear) return;
    const t = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(t);
  }, [confirmClear]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("student_id", "default_student");
    try {
      const res = await uploadTimetable(fd);
      setUploadMsg(`✓ Uploaded! ${res.data.entries_stored} entries stored.`);
      fetchData();
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || "unknown error";
      setUploadMsg(`✗ Upload failed: ${detail}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleClear = async () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    setClearing(true);
    setConfirmClear(false);
    setUploadMsg("");
    try {
      const res = await clearTimetable();
      setUploadMsg(`✓ ${res.data.message}`);
      fetchData();
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || "unknown error";
      setUploadMsg(`✗ Clear failed: ${detail}`);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Timetable</h1>
          <p className="text-gray-400 text-sm mt-1">Your weekly class schedule</p>
        </div>
        <div className="flex gap-2">
          {Object.values(weekly).some((v) => v.length > 0) && (
            <button
              onClick={handleClear}
              disabled={clearing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                confirmClear
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-300"
              }`}
            >
              <Trash2 size={15} />
              {clearing ? "Clearing…" : confirmClear ? "Confirm Clear" : "Clear Timetable"}
            </button>
          )}
          <button
            onClick={() => { setConfirmClear(false); fileRef.current.click(); }}
            disabled={uploading}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Upload size={16} />
            {uploading ? "Uploading…" : "Upload Timetable"}
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.json,.jpg,.jpeg,.png,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.txt" hidden onChange={handleUpload} />
      </div>

      {uploadMsg && (
        <div className={`px-4 py-2 rounded-lg text-sm ${uploadMsg.startsWith("✓") ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}>
          {uploadMsg}
        </div>
      )}

      {/* Next Class */}
      {nextClass && (
        <Card className="border-accent-500/30 bg-accent-500/10 flex items-center gap-4">
          <div className="bg-accent-500/20 p-3 rounded-lg">
            <ChevronRight className="text-accent-500" size={20} />
          </div>
          <div>
            <p className="text-xs text-accent-400 font-semibold uppercase tracking-wide">Next Class</p>
            <p className="text-white font-semibold">{nextClass.subject}</p>
            <p className="text-gray-400 text-sm">
              {nextClass.day} · {nextClass.time}
              {nextClass.room ? ` · ${nextClass.room}` : ""}
              {nextClass.instructor ? ` · ${nextClass.instructor}` : ""}
            </p>
          </div>
        </Card>
      )}

      {/* Weekly grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {DAYS.map((day) => {
          const entries = weekly[day] || [];
          const isToday = day === today;
          return (
            <Card
              key={day}
              className={isToday ? "border-primary-600/50 bg-primary-900/10" : ""}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-semibold ${isToday ? "text-primary-400" : "text-gray-300"}`}>
                  {day}
                  {isToday && (
                    <span className="ml-2 text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">Today</span>
                  )}
                </h3>
                <span className="text-xs text-gray-600">{entries.length} class{entries.length !== 1 ? "es" : ""}</span>
              </div>
              {entries.length === 0 ? (
                <p className="text-gray-600 text-sm">No classes</p>
              ) : (
                <div className="space-y-2">
                  {entries.map((cls) => (
                    <div key={cls.id} className="flex items-start gap-2">
                      <Clock size={13} className="text-gray-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-white font-medium">{cls.subject}</p>
                        <p className="text-xs text-gray-500">
                          {cls.time}{cls.end_time ? ` – ${cls.end_time}` : ""}
                          {cls.room ? ` · ${cls.room}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {Object.values(weekly).every((v) => v.length === 0) && (
        <Card className="text-center py-12">
          <Upload size={40} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No timetable uploaded yet</p>
          <p className="text-gray-600 text-sm mt-1">Upload a PDF, JSON, image, Word, or Excel timetable to get started</p>
        </Card>
      )}
    </div>
  );
}
