const variants = {
  high: "bg-red-900/50 text-red-400 border border-red-800",
  medium: "bg-yellow-900/50 text-yellow-400 border border-yellow-800",
  low: "bg-green-900/50 text-green-400 border border-green-800",
  exam: "bg-purple-900/50 text-purple-400 border border-purple-800",
  assignment: "bg-blue-900/50 text-blue-400 border border-blue-800",
  project: "bg-orange-900/50 text-orange-400 border border-orange-800",
  submission: "bg-teal-900/50 text-teal-400 border border-teal-800",
  default: "bg-gray-800 text-gray-400 border border-gray-700",
};

export default function Badge({ label, variant = "default" }) {
  const cls = variants[variant] || variants.default;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
  );
}
