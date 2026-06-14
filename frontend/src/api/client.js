import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 1500000,
});

// Schedule
export const getToday = (studentId = "default_student") =>
  api.get(`/schedule/today?student_id=${studentId}`);
export const getWeekly = (studentId = "default_student") =>
  api.get(`/schedule/weekly?student_id=${studentId}`);
export const getNextClass = (studentId = "default_student") =>
  api.get(`/schedule/next-class?student_id=${studentId}`);
export const getUpcomingEvents = (studentId = "default_student") =>
  api.get(`/schedule/upcoming?student_id=${studentId}`);
export const getSchedule = (studentId = "default_student") =>
  api.get(`/schedule?student_id=${studentId}`);
export const createSchedule = (data) => api.post("/schedule", data);
export const updateSchedule = (id, data) => api.put(`/schedule/${id}`, data);
export const deleteSchedule = (id) => api.delete(`/schedule/${id}`);

export const clearTimetable = (studentId = "default_student") =>
  api.delete(`/schedule/clear?student_id=${studentId}`, { timeout: 60000 });

// Upload
export const uploadTimetable = (formData) =>
  api.post("/upload/timetable", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const uploadNotice = (formData) =>
  api.post("/upload/notice", formData, { headers: { "Content-Type": "multipart/form-data" } });

// Summaries
export const getSummaries = (studentId = "default_student") =>
  api.get(`/summaries?student_id=${studentId}`);
export const summarizeText = (text) =>
  api.post("/summarize", { text });
export const deleteSummary = (id) => api.delete(`/summaries/${id}`);

// Deadlines
export const getDeadlines = (studentId = "default_student") =>
  api.get(`/deadlines?student_id=${studentId}`);
export const createDeadline = (data) => api.post("/deadlines", data);
export const updateDeadline = (id, data) => api.put(`/deadlines/${id}`, data);
export const deleteDeadline = (id) => api.delete(`/deadlines/${id}`);
export const getStudySuggestions = (studentId = "default_student") =>
  api.post("/schedule/suggestions", { student_id: studentId });

// Documents & Chat
export const uploadDocument = (formData) =>
  api.post("/documents/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const chatQuery = (question, studentId = "default_student") => {
  const now = new Date();
  const current_datetime = now.toLocaleDateString("en-US", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  }) + " " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return api.post("/chat/query", { question, student_id: studentId, current_datetime });
};

// Alerts & Notifications
export const getAlerts = (studentId = "default_student") =>
  api.get(`/alerts?student_id=${studentId}`);
export const generateAlerts = (studentId = "default_student") =>
  api.post(`/alerts/generate?student_id=${studentId}`);
export const generateDemoAlert = (studentId = "default_student") =>
  api.post(`/alerts/demo?student_id=${studentId}`);
export const markAlertAsRead = (id) =>
  api.put(`/alerts/${id}/read`);
export const markAllAlertsAsRead = (studentId = "default_student") =>
  api.put(`/alerts/read/all?student_id=${studentId}`);

export default api;
