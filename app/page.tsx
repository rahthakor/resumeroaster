"use client";

import { useRef, useState, useCallback } from "react";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const ACCEPTED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png";

interface RoastResult {
  roast: string;
  score: {
    overall: number;
    breakdown: {
      clarity: number;
      impact: number;
      formatting: number;
      keywords: number;
      ats: number;
    };
  };
  improvements: Array<{ number: number; title: string; before: string; after: string }>;
  vibe: string;
}

type Status = "idle" | "roasting" | "done" | "error";

const SCORE_LABELS: Record<string, string> = {
  clarity: "Clarity",
  impact: "Impact",
  formatting: "Formatting",
  keywords: "Keywords",
  ats: "ATS",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100;
  const color = value >= 7 ? "#4ade80" : value >= 4 ? "#facc15" : "#ff6b6b";
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm text-right" style={{ color: "#888" }}>{label}</span>
      <div className="flex-1 rounded-full h-2" style={{ backgroundColor: "#ffffff15" }}>
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-6 text-sm font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<RoastResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateFile(f: File): string | null {
    if (!ACCEPTED_TYPES.includes(f.type)) return "Only PDF, JPG, and PNG files are accepted.";
    if (f.size > MAX_FILE_SIZE) return `File too large. Max 10MB (yours: ${(f.size / 1024 / 1024).toFixed(1)}MB).`;
    return null;
  }

  function handleFile(f: File) {
    const err = validateFile(f);
    if (err) { setFileError(err); setFile(null); }
    else { setFileError(null); setFile(f); setResult(null); setApiError(null); }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, []);

  function clearFile() {
    setFile(null); setFileError(null); setResult(null); setApiError(null); setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleRoast() {
    if (!file) return;
    setStatus("roasting");
    setApiError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/roast", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to roast resume.");

      setResult(data);
      setStatus("done");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  const formatSize = (b: number) =>
    b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

  const isLoading = status === "roasting";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#1a1a1a", color: "#ffffff" }}>
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-white/10">
        <span className="text-2xl font-black tracking-tight" style={{ color: "#ff6b6b" }}>
          🔥 ResumeRoaster
        </span>
        <p className="text-sm text-white/50 hidden sm:block">Get Roasted. Get Better.</p>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-10 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-3">
            Your Resume Deserves{" "}
            <span style={{ color: "#ff6b6b" }}>Brutal Honesty</span>
          </h1>
          <p className="text-lg text-white/60">Upload it. Get roasted. Actually improve.</p>
        </div>

        {/* Upload card */}
        <div className="w-full max-w-lg">
          <div
            onClick={() => !file && !isLoading && inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            className="relative rounded-2xl border-2 border-dashed transition-all duration-200 p-10 text-center"
            style={{
              borderColor: dragActive ? "#ff6b6b" : file ? "#ff6b6b55" : "#ffffff33",
              backgroundColor: dragActive ? "#ff6b6b11" : "#ffffff08",
              cursor: file || isLoading ? "default" : "pointer",
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="hidden"
              onChange={handleInputChange}
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <span className="text-4xl">📄</span>
                <p className="font-semibold text-white truncate max-w-xs">{file.name}</p>
                <p className="text-sm" style={{ color: "#888" }}>{formatSize(file.size)}</p>
                {!isLoading && (
                  <button
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    className="mt-1 text-xs transition-colors"
                    style={{ color: "#666" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
                  >
                    ✕ Remove file
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <span className="text-4xl">☁️</span>
                <p className="font-medium text-white/80">Drag your resume here or click to upload</p>
                <p className="text-sm" style={{ color: "#666" }}>PDF, JPG, PNG · Max 10MB</p>
              </div>
            )}
          </div>

          {fileError && (
            <p className="mt-3 text-sm text-center" style={{ color: "#ff6b6b" }}>⚠ {fileError}</p>
          )}

          <button
            onClick={handleRoast}
            disabled={!file || isLoading}
            className="mt-5 w-full py-4 rounded-2xl font-black text-lg tracking-wide transition-all duration-200"
            style={{
              backgroundColor: file && !isLoading ? "#ff6b6b" : "#ffffff15",
              color: file && !isLoading ? "#ffffff" : "#ffffff40",
              cursor: file && !isLoading ? "pointer" : "not-allowed",
            }}
            onMouseEnter={(e) => { if (file && !isLoading) e.currentTarget.style.backgroundColor = "#ff5252"; }}
            onMouseLeave={(e) => { if (file && !isLoading) e.currentTarget.style.backgroundColor = "#ff6b6b"; }}
          >
            {isLoading ? "🔥 Roasting your resume..." : "🔥 Roast My Resume"}
          </button>
        </div>

        {/* API error */}
        {status === "error" && apiError && (
          <div className="mt-6 w-full max-w-lg rounded-xl p-4 text-sm text-center" style={{ backgroundColor: "#ff6b6b22", color: "#ff6b6b", border: "1px solid #ff6b6b44" }}>
            ⚠ {apiError}
          </div>
        )}

        {/* Results card */}
        {status === "done" && result && (
          <div
            className="fade-in mt-10 w-full max-w-2xl rounded-2xl overflow-hidden"
            style={{ backgroundColor: "#111", border: "1px solid #ffffff15" }}
          >
            {/* Result header */}
            <div className="px-6 py-4 border-b" style={{ borderColor: "#ffffff15" }}>
              <p className="text-xs font-mono" style={{ color: "#666" }}>{file?.name}</p>
              <p className="text-2xl font-black mt-1">
                Overall Score:{" "}
                <span style={{ color: result.score.overall >= 7 ? "#4ade80" : result.score.overall >= 4 ? "#facc15" : "#ff6b6b" }}>
                  {result.score.overall}/10
                </span>
              </p>
            </div>

            <div className="p-6 flex flex-col gap-8">
              {/* Roast */}
              <div>
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#666" }}>The Roast</p>
                <p className="text-lg font-black leading-snug" style={{ color: "#ff6b6b" }}>
                  &ldquo;{result.roast}&rdquo;
                </p>
              </div>

              {/* Score breakdown */}
              <div>
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#666" }}>Score Breakdown</p>
                <div className="flex flex-col gap-2">
                  {Object.entries(result.score.breakdown).map(([key, val]) => (
                    <ScoreBar key={key} label={SCORE_LABELS[key] ?? key} value={val} />
                  ))}
                </div>
              </div>

              {/* Improvements */}
              <div>
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#666" }}>Top 5 Improvements</p>
                <div className="flex flex-col gap-4">
                  {result.improvements.map((imp) => (
                    <div key={imp.number} className="rounded-xl p-4" style={{ backgroundColor: "#ffffff08" }}>
                      <p className="font-bold mb-2">
                        <span style={{ color: "#ff6b6b" }}>#{imp.number}</span> {imp.title}
                      </p>
                      <div className="grid sm:grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg p-2" style={{ backgroundColor: "#ff6b6b15" }}>
                          <p className="text-xs mb-1" style={{ color: "#ff6b6b" }}>Before</p>
                          <p style={{ color: "#ccc" }}>{imp.before}</p>
                        </div>
                        <div className="rounded-lg p-2" style={{ backgroundColor: "#4ade8015" }}>
                          <p className="text-xs mb-1" style={{ color: "#4ade80" }}>After</p>
                          <p style={{ color: "#ccc" }}>{imp.after}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vibe */}
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "#ffffff08" }}>
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#666" }}>Overall Vibe</p>
                <p className="italic text-white/70">&ldquo;{result.vibe}&rdquo;</p>
              </div>

              {/* Roast another */}
              <button
                onClick={clearFile}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200"
                style={{ border: "1px solid #ffffff22", color: "#ffffff80" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ff6b6b"; e.currentTarget.style.color = "#ff6b6b"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#ffffff22"; e.currentTarget.style.color = "#ffffff80"; }}
              >
                🔄 Roast Another Resume
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-sm" style={{ color: "#ffffff30" }}>
        Made with <span style={{ color: "#ff6b6b" }}>Claude Code</span>
      </footer>
    </div>
  );
}
