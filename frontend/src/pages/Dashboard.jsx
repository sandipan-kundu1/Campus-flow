import { useEffect, useState } from "react";
import { getToday, getNextClass, getDeadlines, getSummaries, getUpcomingEvents } from "../api/client";
import Card from "../components/Card";
import Badge from "../components/Badge";
import { Clock, BookOpen, AlertCircle, FileText, ChevronRight, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";

export default function Dashboard() {
  const { notifications, unreadCount } = useNotifications();
  const [today, setToday] = useState({ day: "", schedule: [] });
  const [nextClass, setNextClass] = useState(null);
  const [deadlines, setDeadlines] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getToday(),
      getNextClass(),
      getDeadlines(),
      getSummaries(),
      getUpcomingEvents(),
    ]).then(([t, n, d, s, u]) => {
      if (t.status === "fulfilled") setToday(t.value.data);
      if (n.status === "fulfilled") setNextClass(n.value.data.next_class);
      if (d.status === "fulfilled") setDeadlines(d.value.data.deadlines?.slice(0, 4) || []);
      if (s.status === "fulfilled") {
        const allSummaries = s.value.data.summaries || [];
        const noticesOnly = allSummaries.filter(
          (item) =>
            !item.is_mess &&
            !item.title?.toLowerCase().includes("mess") &&
            !item.filename?.toLowerCase().includes("mess")
        );
        setSummaries(noticesOnly.slice(0, 3));
      }
      if (u.status === "fulfilled") setUpcomingEvents(u.value.data.upcoming_events || []);
      setLoading(false);
    });
  }, []);

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">Loading dashboard…</div>
    );

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{greeting} 👋</h1>
        <p className="text-gray-400 mt-1">
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4">
          <div className="bg-primary-600/20 p-3 rounded-lg">
            <BookOpen className="text-primary-500" size={22} />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Classes Today</p>
            <p className="text-2xl font-bold text-white">{today.schedule.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="bg-accent-500/20 p-3 rounded-lg">
            <AlertCircle className="text-accent-500" size={22} />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Pending Deadlines</p>
            <p className="text-2xl font-bold text-white">
              {deadlines.filter((d) => !d.completed).length}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="bg-green-600/20 p-3 rounded-lg">
            <FileText className="text-green-500" size={22} />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Recent Notices</p>
            <p className="text-2xl font-bold text-white">{summaries.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="bg-red-600/20 p-3 rounded-lg">
            <Bell className="text-red-500" size={22} />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Unread Alerts</p>
            <p className="text-2xl font-bold text-white">{unreadCount}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Today's Schedule</h2>
            <Link to="/timetable" className="text-primary-500 text-sm flex items-center gap-1 hover:underline">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          {today.schedule.length === 0 ? (
            <Card>
              <p className="text-gray-500 text-center py-4">No classes scheduled for today.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {today.schedule.map((cls) => (
                <Card key={cls.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-600/20 p-2 rounded-lg">
                      <Clock className="text-primary-400" size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-white">{cls.subject}</p>
                      <p className="text-gray-400 text-sm">
                        {cls.time} {cls.end_time ? `– ${cls.end_time}` : ""}{" "}
                        {cls.room ? `· ${cls.room}` : ""}
                      </p>
                    </div>
                  </div>
                  {cls.instructor && (
                    <span className="text-xs text-gray-500">{cls.instructor}</span>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Next Class banner */}
          {nextClass && (
            <Card className="border-primary-600/40 bg-primary-900/20">
              <p className="text-xs text-primary-400 font-medium mb-1">NEXT CLASS</p>
              <p className="text-white font-semibold">{nextClass.subject}</p>
              <p className="text-gray-400 text-sm">
                {nextClass.day} · {nextClass.time}{" "}
                {nextClass.room ? `· ${nextClass.room}` : ""}
              </p>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Recent Notifications Card */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Recent Notifications</h2>
            </div>
            {notifications.length === 0 ? (
              <Card>
                <p className="text-gray-500 text-sm text-center py-4">No recent alerts.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 3).map((n) => (
                  <Card
                    key={n.id}
                    className={`p-3 border-l-4 transition-all ${
                      n.read ? "border-gray-800 opacity-60 bg-gray-900/40" : "border-primary-500 bg-primary-950/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider">
                        {n.type}
                      </span>
                      <span className="text-[9px] text-gray-500">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-200 mt-1 leading-relaxed">{n.message}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Upcoming Events</h2>
            </div>
            {upcomingEvents.length === 0 ? (
              <Card>
                <p className="text-gray-500 text-sm text-center py-2">No upcoming events.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((e) => (
                  <Card key={e.id} className="space-y-1 border-l-4 border-accent-500">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white truncate">{e.subject}</p>
                      <span className="text-xs text-gray-500">{e.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-accent-400 font-medium">{e.time}{e.end_time ? ` – ${e.end_time}` : ""}</span>
                      {e.room && <span className="text-xs text-gray-500">· {e.room}</span>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Upcoming Deadlines</h2>
              <Link to="/deadlines" className="text-primary-500 text-sm flex items-center gap-1 hover:underline">
                All <ChevronRight size={14} />
              </Link>
            </div>
            {deadlines.length === 0 ? (
              <Card>
                <p className="text-gray-500 text-sm text-center py-2">No deadlines yet.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {deadlines.map((d) => (
                  <Card key={d.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white truncate">{d.title}</p>
                      <Badge label={d.priority} variant={d.priority} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge label={d.type} variant={d.type} />
                      <span className="text-xs text-gray-500">{d.due_date}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Recent Summaries */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Recent Notices</h2>
              <Link to="/documents" className="text-primary-500 text-sm flex items-center gap-1 hover:underline">
                All <ChevronRight size={14} />
              </Link>
            </div>
            {summaries.length === 0 ? (
              <Card>
                <p className="text-gray-500 text-sm text-center py-2">No notices uploaded.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {summaries.map((s) => (
                  <Card key={s.id}>
                    <p className="text-sm font-medium text-white truncate">{s.title}</p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{s.summary}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
