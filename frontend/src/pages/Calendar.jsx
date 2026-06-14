import { useState, useEffect } from "react";
import {
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getDeadlines,
  updateDeadline,
} from "../api/client";
import Card from "../components/Card";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  User,
  CheckCircle,
  Circle,
  Edit2,
  Trash2,
  X,
  Calendar as CalendarIcon,
  BookOpen,
  Filter,
  ListTodo,
} from "lucide-react";
import { toast } from "react-toastify";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const parseTimeToMinutes = (t) => {
  if (!t) return 0;
  t = t.trim().toUpperCase();
  const isPM = t.includes("PM");
  const isAM = t.includes("AM");
  const cleanTime = t.replace("AM", "").replace("PM", "").trim();
  const parts = cleanTime.split(":");
  if (parts.length < 2) return 0;
  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isPM || isAM) {
    if (isPM && hours !== 12) {
      hours += 12;
    } else if (isAM && hours === 12) {
      hours = 0;
    }
  }
  return hours * 60 + minutes;
};

const emptyForm = {
  subject: "",
  day: "Monday",
  time: "09:00",
  end_time: "10:00",
  room: "",
  instructor: "",
  is_one_time: false,
  date: "",
  description: "",
  type: "class", // class, event, personal
};

export default function Calendar() {
  const [schedules, setSchedules] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date states:
  // - selectedDateStr: active date (YYYY-MM-DD)
  // - mainViewDate: current month/year/day being looked at in main calendar area
  // - miniCalendarDate: month/year displayed in compact mini datepicker (left sidebar)
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${mm}-${dd}`;
  });
  const [mainViewDate, setMainViewDate] = useState(new Date());
  const [miniCalendarDate, setMiniCalendarDate] = useState(new Date());

  // Views: 'month' | 'week' | 'day' | 'schedule'
  const [activeView, setActiveView] = useState("month");

  // Filters state
  const [filters, setFilters] = useState({
    classes: true,
    events: true,
    personal: true,
    deadlines: true,
  });

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("class"); // class, personal
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  // Fetch data
  const fetchData = () => {
    setLoading(true);
    Promise.allSettled([getSchedule(), getDeadlines()])
      .then(([schRes, deadRes]) => {
        if (schRes.status === "fulfilled") {
          setSchedules(schRes.value.data.schedule || []);
        }
        if (deadRes.status === "fulfilled") {
          setDeadlines(deadRes.value.data.deadlines || []);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format Helper: (year, month, day) -> YYYY-MM-DD
  const formatDateStr = (year, month, day) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  const toLocalDateStr = (dateObj) => {
    return formatDateStr(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  };

  const parseDateStr = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  // Weekday Name Helper (safe from local offset shifts)
  const getWeekdayName = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return WEEKDAYS[dateObj.getDay()];
  };

  // Mini Calendar Navigation
  const prevMiniMonth = () => {
    setMiniCalendarDate(new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() - 1, 1));
  };

  const nextMiniMonth = () => {
    setMiniCalendarDate(new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() + 1, 1));
  };

  // Main Calendar Navigation
  const handleTodayClick = () => {
    const today = new Date();
    const todayStr = toLocalDateStr(today);
    setSelectedDateStr(todayStr);
    setMainViewDate(today);
    setMiniCalendarDate(today);
  };

  const handlePrevClick = () => {
    if (activeView === "month") {
      setMainViewDate(new Date(mainViewDate.getFullYear(), mainViewDate.getMonth() - 1, 1));
    } else if (activeView === "week") {
      const [y, m, d] = selectedDateStr.split("-").map(Number);
      const prevWeek = new Date(y, m - 1, d - 7);
      const prevWeekStr = toLocalDateStr(prevWeek);
      setSelectedDateStr(prevWeekStr);
      setMainViewDate(prevWeek);
    } else if (activeView === "day") {
      const [y, m, d] = selectedDateStr.split("-").map(Number);
      const prevDay = new Date(y, m - 1, d - 1);
      const prevDayStr = toLocalDateStr(prevDay);
      setSelectedDateStr(prevDayStr);
      setMainViewDate(prevDay);
    }
  };

  const handleNextClick = () => {
    if (activeView === "month") {
      setMainViewDate(new Date(mainViewDate.getFullYear(), mainViewDate.getMonth() + 1, 1));
    } else if (activeView === "week") {
      const [y, m, d] = selectedDateStr.split("-").map(Number);
      const nextWeek = new Date(y, m - 1, d + 7);
      const nextWeekStr = toLocalDateStr(nextWeek);
      setSelectedDateStr(nextWeekStr);
      setMainViewDate(nextWeek);
    } else if (activeView === "day") {
      const [y, m, d] = selectedDateStr.split("-").map(Number);
      const nextDay = new Date(y, m - 1, d + 1);
      const nextDayStr = toLocalDateStr(nextDay);
      setSelectedDateStr(nextDayStr);
      setMainViewDate(nextDay);
    }
  };

  // Compile day schedule events & deadlines
  const getEventsForDate = (dateStr) => {
    const dayOfWeek = getWeekdayName(dateStr);
    const dayEvents = [];

    // 1. Repeating Classes (weekday matches and is_one_time = false)
    schedules.forEach((item) => {
      if (!item.is_one_time && item.day.toLowerCase() === dayOfWeek.toLowerCase()) {
        dayEvents.push({
          ...item,
          eventClass: "class",
          displayType: "Class",
        });
      }
    });

    // 2. One-time Event/Personal Event (date matches and is_one_time = true)
    schedules.forEach((item) => {
      if (item.is_one_time && item.date === dateStr) {
        const type = item.type || "event";
        dayEvents.push({
          ...item,
          eventClass: type,
          displayType: type === "personal" ? "Personal Event" : "Event",
        });
      }
    });

    // 3. Deadlines (due_date matches date)
    deadlines.forEach((item) => {
      if (item.due_date === dateStr) {
        dayEvents.push({
          id: item.id,
          subject: item.title,
          time: "23:59",
          end_time: "",
          room: item.subject || "",
          instructor: item.priority || "medium",
          isDeadline: true,
          completed: item.completed,
          type: item.type,
          description: item.description,
          eventClass: "deadline",
          displayType: "Deadline",
        });
      }
    });

    // Sort events chronologically
    dayEvents.sort((a, b) => {
      return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    });

    return dayEvents;
  };

  // Filter events based on active sidebar checklist
  const filterEvents = (events) => {
    return events.filter((e) => {
      if (e.isDeadline) return filters.deadlines;
      if (e.eventClass === "class") return filters.classes;
      if (e.eventClass === "personal") return filters.personal;
      return filters.events;
    });
  };

  // Mini-Calendar (Sunday-first) Grid
  const getMiniCalendarGrid = () => {
    const y = miniCalendarDate.getFullYear();
    const m = miniCalendarDate.getMonth();
    const firstDay = new Date(y, m, 1);
    const startDayIdx = firstDay.getDay(); // Sunday-first: 0 = Sun, 1 = Mon...

    const daysInM = new Date(y, m + 1, 0).getDate();
    const daysInPrevM = new Date(y, m, 0).getDate();

    const cells = [];
    // Previous month filler days
    for (let i = startDayIdx - 1; i >= 0; i--) {
      const dayNum = daysInPrevM - i;
      const prevM = m === 0 ? 11 : m - 1;
      const prevY = m === 0 ? y - 1 : y;
      cells.push({ dayNum, dateStr: formatDateStr(prevY, prevM, dayNum), isCurrent: false });
    }
    // Current month days
    for (let i = 1; i <= daysInM; i++) {
      cells.push({ dayNum: i, dateStr: formatDateStr(y, m, i), isCurrent: true });
    }
    // Next month filler days to complete 35 or 42 cells depending on height
    const totalSlots = startDayIdx + daysInM;
    const gridSlots = totalSlots <= 35 ? 35 : 42;
    const remaining = gridSlots - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const nextM = m === 11 ? 0 : m + 1;
      const nextY = m === 11 ? y + 1 : y;
      cells.push({ dayNum: i, dateStr: formatDateStr(nextY, nextM, i), isCurrent: false });
    }
    return cells;
  };

  // Main Month Grid (Sunday-first)
  const getMainMonthGrid = () => {
    const y = mainViewDate.getFullYear();
    const m = mainViewDate.getMonth();
    const firstDay = new Date(y, m, 1);
    const startDayIdx = firstDay.getDay(); // Sunday-first: 0 = Sun, 1 = Mon...

    const daysInM = new Date(y, m + 1, 0).getDate();
    const daysInPrevM = new Date(y, m, 0).getDate();

    const cells = [];
    // Previous month filler days
    for (let i = startDayIdx - 1; i >= 0; i--) {
      const dayNum = daysInPrevM - i;
      const prevM = m === 0 ? 11 : m - 1;
      const prevY = m === 0 ? y - 1 : y;
      cells.push({ dayNum, dateStr: formatDateStr(prevY, prevM, dayNum), isCurrent: false });
    }
    // Current month days
    for (let i = 1; i <= daysInM; i++) {
      cells.push({ dayNum: i, dateStr: formatDateStr(y, m, i), isCurrent: true });
    }
    // Next month filler days to complete 35 or 42 cells depending on height
    const totalSlots = startDayIdx + daysInM;
    const gridSlots = totalSlots <= 35 ? 35 : 42;
    const remaining = gridSlots - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const nextM = m === 11 ? 0 : m + 1;
      const nextY = m === 11 ? y + 1 : y;
      cells.push({ dayNum: i, dateStr: formatDateStr(nextY, nextM, i), isCurrent: false });
    }
    return cells;
  };

  // Active Week (Sunday-first: Sun to Sat)
  const getActiveWeekDays = () => {
    const [y, m, d] = selectedDateStr.split("-").map(Number);
    const refDate = new Date(y, m - 1, d);
    const weekdayIdx = refDate.getDay(); // 0 = Sunday, 1 = Monday...
    const diff = refDate.getDate() - weekdayIdx; // Shift back to Sunday
    const sunday = new Date(refDate.setDate(diff));

    const week = [];
    for (let i = 0; i < 7; i++) {
      const temp = new Date(sunday);
      temp.setDate(sunday.getDate() + i);
      week.push(toLocalDateStr(temp));
    }
    return week;
  };

  // Deadline toggle complete
  const handleToggleDeadline = async (id, currentCompleted) => {
    try {
      await updateDeadline(id, { completed: !currentCompleted });
      toast.success("Deadline status updated!");
      fetchData();
    } catch (err) {
      toast.error("Failed to update deadline");
    }
  };

  // Event Edit/Delete/Create Form Handler
  const handleOpenAddModal = (dateStr = selectedDateStr) => {
    setEditingId(null);
    const dayName = getWeekdayName(dateStr);
    setForm({
      ...emptyForm,
      day: dayName,
      date: dateStr,
    });
    setModalTab("class");
    setModalOpen(true);
  };

  const handleOpenEditModal = (event) => {
    setEditingId(event.id);
    setForm({
      subject: event.subject,
      day: event.day || "Monday",
      time: event.time || "09:00",
      end_time: event.end_time || "10:00",
      room: event.room || "",
      instructor: event.instructor || "",
      is_one_time: event.is_one_time || false,
      date: event.date || selectedDateStr,
      description: event.description || "",
      type: event.type || "class",
    });
    setModalTab(event.is_one_time ? "personal" : "class");
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const isOneTime = modalTab === "personal";
    const postData = {
      subject: form.subject,
      day: isOneTime ? getWeekdayName(form.date) : form.day,
      time: form.time,
      end_time: form.end_time,
      room: form.room,
      instructor: form.instructor,
      is_one_time: isOneTime,
      date: isOneTime ? form.date : "",
      description: form.description,
      type: isOneTime ? form.type : "class",
    };

    try {
      if (editingId) {
        await updateSchedule(editingId, postData);
        toast.success("Event updated!");
      } else {
        await createSchedule(postData);
        toast.success("Event scheduled!");
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error("Error saving event");
    }
  };

  const handleDeleteEvent = async (id) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        await deleteSchedule(id);
        toast.success("Event deleted");
        fetchData();
      } catch (err) {
        toast.error("Failed to delete event");
      }
    }
  };

  // Color Styles based on Event Type
  const getEventColors = (type, isDeadline, completed) => {
    if (isDeadline) {
      return completed
        ? {
            bg: "bg-gray-800/40 text-gray-500 border-gray-700/50 line-through",
            solid: "bg-gray-700 text-gray-400 line-through",
            text: "text-gray-500",
            dot: "bg-gray-600",
          }
        : {
            bg: "bg-red-550/10 text-red-400 border-red-500/20",
            solid: "bg-red-600/90 text-white border-transparent",
            text: "text-red-400",
            dot: "bg-red-500",
          };
    }
    if (type === "class") {
      return {
        bg: "bg-primary-500/10 text-primary-400 border-primary-500/20",
        solid: "bg-primary-600 text-white border-transparent",
        text: "text-primary-400",
        dot: "bg-primary-500",
      };
    }
    if (type === "personal") {
      return {
        bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        solid: "bg-emerald-600 text-white border-transparent",
        text: "text-emerald-400",
        dot: "bg-emerald-500",
      };
    }
    return {
      bg: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      solid: "bg-orange-600 text-white border-transparent",
      text: "text-orange-400",
      dot: "bg-orange-500",
    };
  };

  // Calculate timeline display positioning (08:00 AM to 10:00 PM)
  const calculatePosition = (timeStr, endTimeStr) => {
    const timelineStart = 8 * 60; // 08:00 AM
    const start = parseTimeToMinutes(timeStr);
    const end = endTimeStr ? parseTimeToMinutes(endTimeStr) : start + 60;
    const duration = end - start;

    const topMins = Math.max(0, start - timelineStart);
    const heightMins = Math.max(30, duration);

    const pctTop = (topMins / (14 * 60)) * 100;
    const pctHeight = (heightMins / (14 * 60)) * 100;

    return {
      top: `${pctTop}%`,
      height: `${pctHeight}%`,
    };
  };

  const getHoursList = () => {
    const hours = [];
    for (let h = 8; h <= 21; h++) {
      const display = h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`;
      hours.push({ hour: h, display });
    }
    return hours;
  };

  // Info details for Selected Date Agenda
  const selectedEvents = getEventsForDate(selectedDateStr);
  const filteredSelectedEvents = filterEvents(selectedEvents);

  const getDayFormattedTitle = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const year = mainViewDate.getFullYear();
  const monthName = mainViewDate.toLocaleString("default", { month: "long" });
  const todayStr = toLocalDateStr(new Date());

  const showRightSidebar = activeView === "month" || activeView === "week";

  return (
    <div className="flex h-[calc(100vh-120px)] bg-gray-950 text-gray-100 overflow-hidden font-sans border border-gray-800 rounded-2xl shadow-xl">
      {/* 1. Sidebar Panel (Left) */}
      <aside className="w-[240px] border-r border-gray-800 bg-gray-900/40 flex flex-col p-4 shrink-0 overflow-y-auto scrollbar-thin">
        {/* Create Event pill button */}
        <button
          onClick={() => handleOpenAddModal(selectedDateStr)}
          className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 hover:shadow-md border border-gray-700/80 rounded-full px-5 py-2.5 mb-6 text-sm font-semibold transition-all w-fit text-primary-400 group"
        >
          <div className="bg-primary-500/10 p-1.5 rounded-full group-hover:bg-primary-500/20 transition-all">
            <Plus size={16} className="text-primary-500" />
          </div>
          <span>Create</span>
        </button>

        {/* Sidebar Mini Month Calendar Datepicker (Always starts on Sunday) */}
        <div className="mb-6 shrink-0">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-bold text-gray-300">
              {miniCalendarDate.toLocaleString("default", { month: "long" })}{" "}
              {miniCalendarDate.getFullYear()}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMiniMonth}
                className="p-1 hover:bg-gray-850 text-gray-400 hover:text-white rounded-md transition-colors"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={nextMiniMonth}
                className="p-1 hover:bg-gray-850 text-gray-400 hover:text-white rounded-md transition-colors"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
          {/* Weekday letters starting with Sunday */}
          <div className="text-center text-[10px] font-bold text-gray-500 mb-1" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
            {WEEKDAYS_SHORT.map((d) => (
              <div key={d}>{d.charAt(0)}</div>
            ))}
          </div>
          {/* Days Grid starting with Sunday */}
          <div className="gap-y-0.5 text-center text-xs" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
            {getMiniCalendarGrid().map(({ dayNum, dateStr, isCurrent }) => {
              const isSelected = dateStr === selectedDateStr;
              const isToday = todayStr === dateStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => {
                    setSelectedDateStr(dateStr);
                    setMainViewDate(parseDateStr(dateStr));
                  }}
                  className={`py-1 rounded-full cursor-pointer flex items-center justify-center transition-all ${
                    isCurrent
                      ? "text-gray-300 hover:bg-gray-800"
                      : "text-gray-650 hover:bg-gray-800/30"
                  } ${
                    isSelected
                      ? "bg-primary-600/30 text-primary-400 font-bold border border-primary-500/30"
                      : ""
                  } ${
                    isToday && !isSelected
                      ? "bg-primary-600 text-white font-bold"
                      : ""
                  }`}
                  style={{ aspectRatio: "1" }}
                >
                  {dayNum}
                </div>
              );
            })}
          </div>
        </div>

        {/* My Calendars Filter Checkbox Section */}
        <div className="border-t border-gray-800 pt-4 mt-auto sm:mt-0">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Filter size={10} className="text-primary-500" />
            My Calendars
          </h4>
          <div className="space-y-2.5">
            <label className="flex items-center gap-2.5 text-xs text-gray-300 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.classes}
                onChange={(e) => setFilters({ ...filters, classes: e.target.checked })}
                className="rounded border-gray-700 bg-gray-850 text-primary-600 focus:ring-primary-500 focus:ring-offset-gray-900"
              />
              <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0"></span>
              Classes
            </label>
            <label className="flex items-center gap-2.5 text-xs text-gray-300 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.events}
                onChange={(e) => setFilters({ ...filters, events: e.target.checked })}
                className="rounded border-gray-700 bg-gray-855 text-orange-600 focus:ring-orange-500 focus:ring-offset-gray-900"
              />
              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0"></span>
              Events
            </label>
            <label className="flex items-center gap-2.5 text-xs text-gray-300 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.personal}
                onChange={(e) => setFilters({ ...filters, personal: e.target.checked })}
                className="rounded border-gray-700 bg-gray-850 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-gray-900"
              />
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              Personal Tasks
            </label>
            <label className="flex items-center gap-2.5 text-xs text-gray-300 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.deadlines}
                onChange={(e) => setFilters({ ...filters, deadlines: e.target.checked })}
                className="rounded border-gray-700 bg-gray-850 text-red-600 focus:ring-red-500 focus:ring-offset-gray-900"
              />
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
              Deadlines
            </label>
          </div>
        </div>
      </aside>

      {/* 2. Main Calendar Area (Middle) */}
      <main className="flex-1 flex flex-col bg-gray-900/20 overflow-hidden">
        {/* Top Control Bar */}
        <header className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/40 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={handleTodayClick}
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs font-semibold text-gray-200 transition-colors"
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevClick}
                className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextClick}
                className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            {/* Context title depending on view */}
            <span className="text-sm font-semibold text-white">
              {activeView === "month" && (
                <>
                  {monthName} {year}
                </>
              )}
              {activeView === "day" && (
                <>{parseDateStr(selectedDateStr).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</>
              )}
              {activeView === "week" && (
                <>
                  Week of{" "}
                  {parseDateStr(getActiveWeekDays()[0]).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                  –{" "}
                  {parseDateStr(getActiveWeekDays()[6]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </>
              )}
              {activeView === "schedule" && <>Full Schedule Timeline</>}
            </span>
          </div>

          {/* View switcher switch */}
          <div className="border border-gray-800 bg-gray-950/40 rounded-lg p-0.5 flex gap-0.5 text-xs font-semibold">
            {["day", "week", "month", "schedule"].map((v) => (
              <button
                key={v}
                onClick={() => {
                  setActiveView(v);
                }}
                className={`px-3 py-1 rounded-md transition-colors uppercase text-[10px] tracking-wider ${
                  activeView === v
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </header>

        {/* View Content area */}
        <div className="flex-1 overflow-y-auto p-4 relative scrollbar-thin">
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Syncing calendar entries…
            </div>
          ) : (
            <>
              {/* --- MONTH VIEW (Grid starts on Sunday) --- */}
              {activeView === "month" && (
                <div className="h-full flex flex-col min-h-[420px]">
                  {/* Sunday first weekday headers */}
                  <div className="text-center text-[10px] font-bold text-gray-455 uppercase tracking-wider mb-2 border-b border-gray-800/30 pb-2" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
                    {WEEKDAYS_SHORT.map((d) => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>
                  {/* Days grid */}
                  <div className="flex-1 border-t border-l border-gray-850" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
                    {getMainMonthGrid().map(({ dayNum, dateStr, isCurrent }) => {
                      const dayEvents = getEventsForDate(dateStr);
                      const filteredDayEvents = filterEvents(dayEvents);
                      const isSelected = dateStr === selectedDateStr;
                      const isToday = todayStr === dateStr;

                      return (
                        <div
                          key={dateStr}
                          onClick={() => {
                            setSelectedDateStr(dateStr);
                          }}
                          className={`min-h-[85px] border-r border-b border-gray-800 flex flex-col p-1.5 cursor-pointer transition-colors relative hover:bg-gray-800/10 ${
                            isCurrent
                              ? "bg-gray-900/20"
                              : "bg-gray-950/20 text-gray-600"
                          } ${
                            isSelected
                              ? "bg-primary-900/5 ring-1 ring-primary-500/50"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                                isToday
                                  ? "bg-primary-600 text-white font-bold"
                                  : isCurrent
                                  ? "text-gray-300"
                                  : "text-gray-650"
                              }`}
                            >
                              {dayNum}
                            </span>
                            {filteredDayEvents.length > 0 && (
                              <span className="w-1 h-1 rounded-full bg-primary-500"></span>
                            )}
                          </div>

                          <div className="flex-1 flex flex-col gap-1 overflow-hidden justify-start max-h-[60px]">
                            {filteredDayEvents.slice(0, 2).map((e) => {
                              const colors = getEventColors(
                                e.type,
                                e.isDeadline,
                                e.completed
                              );
                              return (
                                <div
                                  key={e.id}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (e.isDeadline) {
                                      handleToggleDeadline(e.id, e.completed);
                                    } else {
                                      handleOpenEditModal(e);
                                    }
                                  }}
                                  className={`text-[9px] px-1.5 py-0.5 rounded truncate font-medium border transition-colors hover:brightness-110 ${colors.bg}`}
                                >
                                  {e.time && e.time !== "23:59" ? `${e.time} ` : ""}
                                  {e.subject}
                                </div>
                              );
                            })}
                            {filteredDayEvents.length > 2 && (
                              <div className="text-[8px] text-gray-550 font-bold px-1">
                                + {filteredDayEvents.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --- WEEK VIEW (Grid starts on Sunday) --- */}
              {activeView === "week" && (
                <div className="gap-2 h-full min-h-[420px]" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
                  {getActiveWeekDays().map((dateStr) => {
                    const dayEvents = filterEvents(getEventsForDate(dateStr));
                    const isToday = todayStr === dateStr;
                    const isSelected = dateStr === selectedDateStr;

                    return (
                      <div
                        key={dateStr}
                        onClick={() => setSelectedDateStr(dateStr)}
                        className={`flex flex-col border border-gray-800 rounded-xl p-2.5 bg-gray-900/15 hover:bg-gray-800/10 cursor-pointer transition-all ${
                          isSelected
                            ? "ring-2 ring-primary-500 border-transparent bg-primary-900/5"
                            : ""
                        }`}
                      >
                        <div className="border-b border-gray-850 pb-2 mb-3 text-center">
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">
                            {getWeekdayName(dateStr).substring(0, 3)}
                          </p>
                          <p
                            className={`text-base font-extrabold mt-0.5 inline-block px-1.5 py-0.5 rounded-full ${
                              isToday ? "bg-primary-600 text-white" : "text-gray-200"
                            }`}
                          >
                            {dateStr.split("-")[2]}
                          </p>
                        </div>

                        <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-0.5 scrollbar-thin">
                          {dayEvents.length === 0 ? (
                            <p className="text-[9px] text-gray-650 text-center py-4 italic">
                              Free
                            </p>
                          ) : (
                            dayEvents.map((e) => {
                              const colors = getEventColors(
                                e.type,
                                e.isDeadline,
                                e.completed
                              );
                              return (
                                <div
                                  key={e.id}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (e.isDeadline) {
                                      handleToggleDeadline(e.id, e.completed);
                                    } else {
                                      handleOpenEditModal(e);
                                    }
                                  }}
                                  className={`p-2 border rounded-lg transition-colors hover:brightness-105 text-left flex flex-col gap-1 border-l-4 ${colors.bg}`}
                                  style={{ borderLeftColor: e.isDeadline ? (e.completed ? "#4b5563" : "#ef4444") : e.type === "class" ? "#3b82f6" : e.type === "personal" ? "#10b981" : "#f97316" }}
                                >
                                  <span className="text-[8px] font-bold text-gray-500 uppercase">
                                    {e.displayType}
                                  </span>
                                  <h4 className="text-[10px] font-semibold text-white leading-tight truncate">
                                    {e.subject}
                                  </h4>
                                  {e.time && e.time !== "23:59" && (
                                    <span className="text-[8px] text-gray-400">
                                      {e.time}
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* --- DAY VIEW (Hourly Google Calendar absolute positioning) --- */}
              {activeView === "day" && (
                <div className="h-full flex flex-col border border-gray-800 bg-gray-900/35 rounded-xl overflow-hidden min-h-[420px]">
                  <div className="bg-gray-900/50 p-3.5 border-b border-gray-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-white">
                        {getDayFormattedTitle(selectedDateStr)}
                      </h3>
                      <p className="text-[9px] text-primary-400 font-bold uppercase tracking-wider mt-0.5">
                        Selected Date Schedule
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenAddModal(selectedDateStr)}
                      className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-lg shadow-primary-500/10"
                    >
                      <Plus size={13} /> Add Event
                    </button>
                  </div>

                  <div className="flex-1 flex overflow-y-auto scrollbar-thin relative min-h-[350px]">
                    <div className="w-[80px] border-r border-gray-800 flex flex-col bg-gray-900/20 shrink-0">
                      {getHoursList().map(({ hour, display }) => (
                        <div
                          key={hour}
                          className="text-[10px] font-semibold text-gray-500 text-right pr-3 pt-1 border-b border-gray-800/10 flex items-start justify-end"
                          style={{ height: "80px" }}
                        >
                          {display}
                        </div>
                      ))}
                    </div>

                    <div className="flex-1 relative bg-gray-950/10" style={{ height: "1120px" }}>
                      {getHoursList().map(({ hour }) => (
                        <div
                          key={hour}
                          className="border-b border-gray-850 pointer-events-none"
                          style={{ height: "80px" }}
                        ></div>
                      ))}

                      {filterEvents(getEventsForDate(selectedDateStr)).map((e) => {
                        const { top, height } = calculatePosition(
                          e.time,
                          e.end_time
                        );
                        const colors = getEventColors(
                          e.type,
                          e.isDeadline,
                          e.completed
                        );

                        return (
                          <div
                            key={e.id}
                            onClick={() => {
                              if (e.isDeadline) {
                                handleToggleDeadline(e.id, e.completed);
                              } else {
                                handleOpenEditModal(e);
                              }
                            }}
                            className={`absolute left-2 right-2 rounded-lg p-2 shadow border hover:brightness-110 flex flex-col justify-between cursor-pointer transition-all border-l-4 group ${colors.bg}`}
                            style={{
                              top,
                              height,
                              borderLeftColor: e.isDeadline ? (e.completed ? "#4b5563" : "#ef4444") : e.type === "class" ? "#3b82f6" : e.type === "personal" ? "#10b981" : "#f97316",
                            }}
                          >
                            <div className="min-w-0 flex-1 flex flex-col h-full justify-between">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[8px] font-extrabold text-gray-400 uppercase tracking-wide">
                                    {e.displayType}
                                  </span>
                                  {e.isDeadline && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                  )}
                                </div>
                                <h4
                                  className={`text-xs font-bold text-white leading-tight truncate mt-0.5 ${
                                    e.isDeadline && e.completed
                                      ? "line-through text-gray-500"
                                      : ""
                                  }`}
                                >
                                  {e.subject}
                                </h4>
                              </div>

                              <div className="flex flex-wrap gap-x-2 text-[9px] text-gray-450 mt-1">
                                {e.time && e.time !== "23:59" && (
                                  <span className="flex items-center gap-1">
                                    <Clock size={8} />
                                    {e.time}
                                    {e.end_time ? ` – ${e.end_time}` : ""}
                                  </span>
                                )}
                                {e.room && (
                                  <span className="flex items-center gap-1 max-w-[120px] truncate">
                                    <MapPin size={8} />
                                    {e.room}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {e.isDeadline ? (
                                <button
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    handleToggleDeadline(e.id, e.completed);
                                  }}
                                  className="text-gray-500 hover:text-green-400 transition-colors"
                                >
                                  {e.completed ? (
                                    <CheckCircle size={15} className="text-green-500" />
                                  ) : (
                                    <Circle size={15} />
                                  )}
                                </button>
                              ) : (
                                <button
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    handleDeleteEvent(e.id);
                                  }}
                                  className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* --- SCHEDULE / AGENDA VIEW --- */}
              {activeView === "schedule" && (
                <div className="space-y-6 max-w-2xl mx-auto p-1">
                  <div className="border-b border-gray-800 pb-2">
                    <h3 className="text-sm font-bold text-white">
                      Agenda Flow
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Stream of upcoming classes, events and submission deadlines
                    </p>
                  </div>

                  {schedules.length === 0 && deadlines.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 text-xs">
                      No events scheduled.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        ...new Set([
                          ...schedules.filter((s) => s.is_one_time).map((s) => s.date),
                          ...deadlines.map((d) => d.due_date),
                          ...Array.from({ length: 7 }, (_, i) => {
                            const d = new Date();
                            d.setDate(d.getDate() + i);
                            return toLocalDateStr(d);
                          }),
                        ]),
                      ]
                        .sort()
                        .filter((dStr) => dStr)
                        .map((dateStr) => {
                          const dayEvents = filterEvents(getEventsForDate(dateStr));
                          if (dayEvents.length === 0) return null;

                          return (
                            <div key={dateStr} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-gray-900/20 border border-gray-850 rounded-xl hover:bg-gray-800/10 transition-colors">
                              <div className="sm:col-span-1">
                                <h4 className="text-xs font-bold text-white">
                                  {getDayFormattedTitle(dateStr)}
                                </h4>
                                <span className="text-[9px] text-primary-400 font-bold uppercase tracking-wider">
                                  {getWeekdayName(dateStr)}
                                </span>
                              </div>
                              <div className="sm:col-span-3 space-y-2">
                                {dayEvents.map((e) => (
                                  <div
                                    key={e.id}
                                    onClick={() => {
                                      if (e.isDeadline) {
                                        handleToggleDeadline(e.id, e.completed);
                                      } else {
                                        handleOpenEditModal(e);
                                      }
                                    }}
                                    className="flex items-center justify-between gap-4 p-2.5 bg-gray-950/20 hover:bg-gray-800/20 border border-gray-800/40 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${e.isDeadline ? (e.completed ? "bg-gray-600" : "bg-red-500") : e.type === "class" ? "bg-primary-500" : e.type === "personal" ? "bg-emerald-500" : "bg-orange-500"}`}></span>
                                      <div>
                                        <p className={`text-xs font-semibold text-white ${e.isDeadline && e.completed ? "line-through text-gray-550" : ""}`}>
                                          {e.subject}
                                        </p>
                                        <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">
                                          {e.displayType} {e.time && e.time !== "23:59" ? `· ${e.time}` : ""}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="shrink-0">
                                      {e.room && <span className="text-[9px] text-gray-500">{e.room}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 3. Day Detail Agenda Sidebar (Right, visible in Month/Week views) */}
      {showRightSidebar && (
        <aside className="w-[400px] border-l border-gray-800 bg-gray-900/50 flex flex-col shrink-0 overflow-y-auto scrollbar-thin">
          <header className="p-4 border-b border-gray-800 shrink-0 bg-gray-950/20">
            <span className="text-[9px] text-primary-400 font-extrabold uppercase tracking-wider">
              Selected Agenda
            </span>
            <h3 className="text-xs font-bold text-white mt-0.5">
              {getDayFormattedTitle(selectedDateStr)}
            </h3>
          </header>

          <div className="flex-1 p-4 space-y-3.5 overflow-y-auto scrollbar-thin">
            <button
              onClick={() => {
                setActiveView("day");
              }}
              className="w-full bg-primary-600/10 hover:bg-primary-600/20 text-primary-400 text-[10px] font-bold py-2 rounded-xl transition-all border border-primary-500/20 flex items-center justify-center gap-1.5 uppercase tracking-wider"
            >
              <ListTodo size={12} />
              Open Day Timeline
            </button>

            {filteredSelectedEvents.length === 0 ? (
              <div className="py-12 text-center text-gray-550 text-xs italic">
                No events scheduled.
              </div>
            ) : (
              filteredSelectedEvents.map((e) => (
                <div
                  key={e.id}
                  onClick={() => {
                    if (e.isDeadline) {
                      handleToggleDeadline(e.id, e.completed);
                    } else {
                      handleOpenEditModal(e);
                    }
                  }}
                  className="p-3 border border-gray-800 rounded-lg bg-gray-950/20 hover:bg-gray-800/20 transition-all cursor-pointer flex items-start justify-between border-l-4"
                  style={{ borderLeftColor: e.isDeadline ? (e.completed ? "#4b5563" : "#ef4444") : e.type === "class" ? "#3b82f6" : e.type === "personal" ? "#10b981" : "#f97316" }}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[8px] font-bold text-gray-500 uppercase block">
                      {e.displayType}
                    </span>
                    <h4 className={`text-xs font-bold text-white mt-0.5 leading-tight truncate ${e.isDeadline && e.completed ? "line-through text-gray-550" : ""}`}>
                      {e.subject}
                    </h4>
                    {e.time && e.time !== "23:59" && (
                      <span className="text-[9px] text-gray-400 block mt-1">
                        {e.time} {e.end_time ? `– ${e.end_time}` : ""}
                      </span>
                    )}
                    {e.room && <span className="text-[9px] text-gray-500 block truncate">{e.room}</span>}
                  </div>
                  {e.isDeadline ? (
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        handleToggleDeadline(e.id, e.completed);
                      }}
                      className="text-gray-550 hover:text-green-400 transition-colors shrink-0 pl-1"
                    >
                      {e.completed ? (
                        <CheckCircle size={15} className="text-green-500" />
                      ) : (
                        <Circle size={15} />
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        handleDeleteEvent(e.id);
                      }}
                      className="text-gray-500 hover:text-red-400 transition-colors shrink-0 pl-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          <footer className="p-3 border-t border-gray-850 bg-gray-950/10 shrink-0">
            <button
              onClick={() => {
                handleOpenAddModal(selectedDateStr);
              }}
              className="w-full bg-gray-850 hover:bg-gray-800 text-white text-[10px] font-bold py-2 rounded-xl transition-all border border-gray-750 flex items-center justify-center gap-1.5 uppercase tracking-wider"
            >
              <Plus size={12} /> Add event to day
            </button>
          </footer>
        </aside>
      )}

      {/* 4. Event Scheduling Modal (Google Calendar Popup style) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg border-gray-800 bg-gray-900 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? "Edit Event details" : "Schedule Calendar Event"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs for repeating classes vs personal tasks */}
            {!editingId && (
              <div className="flex border-b border-gray-800 mb-4 bg-gray-950/30 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setModalTab("class")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    modalTab === "class"
                      ? "bg-primary-600 text-white shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <BookOpen size={12} className="inline mr-1.5 -mt-0.5" />
                  Repeating Class
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("personal")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    modalTab === "personal"
                      ? "bg-emerald-600 text-white shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <CalendarIcon size={12} className="inline mr-1.5 -mt-0.5" />
                  One-time / Personal Event
                </button>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                  {modalTab === "class" ? "Subject / Course Name" : "Event Title"}
                </label>
                <input
                  required
                  placeholder={modalTab === "class" ? "e.g. Advanced DBMS" : "e.g. Project Discussion"}
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </div>

              {modalTab === "class" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                      Day of Week
                    </label>
                    <select
                      value={form.day}
                      onChange={(e) => setForm({ ...form, day: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                    >
                      {WEEKDAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                      Instructor
                    </label>
                    <input
                      placeholder="e.g. Dr. Roy"
                      value={form.instructor}
                      onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                      Event Date
                    </label>
                    <input
                      required
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                      Event Type
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                    >
                      <option value="personal">Personal / Task</option>
                      <option value="event">Campus Event</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Start Time
                  </label>
                  <input
                    required
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                  Location / Room
                </label>
                <input
                  placeholder="e.g. Room 402, Block C"
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                  Description / Notes
                </label>
                <textarea
                  placeholder="Additional description..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-850">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-primary-500/10"
                >
                  Save Event
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
