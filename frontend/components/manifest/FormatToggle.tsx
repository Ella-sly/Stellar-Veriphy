"use client";

interface FormatToggleProps {
  format: "json" | "xml";
  onChange: (format: "json" | "xml") => void;
}

export function FormatToggle({ format, onChange }: FormatToggleProps) {
  return (
    <div className="flex gap-1 bg-gray-200 rounded-lg p-1 w-fit">
      <button
        onClick={() => onChange("json")}
        className={`px-4 py-2 rounded font-medium transition-colors ${
          format === "json"
            ? "bg-white text-blue-600 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        JSON
      </button>
      <button
        onClick={() => onChange("xml")}
        className={`px-4 py-2 rounded font-medium transition-colors ${
          format === "xml"
            ? "bg-white text-blue-600 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        XML
      </button>
    </div>
  );
}
