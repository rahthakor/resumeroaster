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
  clarity: "CLARITY",
  impact: "IMPACT",
  formatting: "FORMAT",
  keywords: "KEYWORDS",
  ats: "ATS",
};

function scoreColor(v: number) {
  return v >= 7 ? "#4ade80" : v >= 4 ? "#fbbf24" : "#ff6b6b";
}

function ScoreCell({ label, value, delay = 0 }: { label: string; value: number; delay?: number }) {
  const color = scoreColor(value);
  const pct = (value / 10) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", animationDelay: `${delay}ms` }}>
      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px", letterSpacing: "0.12em", fontFamily: "var(--font-mono)" }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
        <span style={{ fontSize: "2.2rem", fontWeight: 900, fontFamily: "var(--font-display)", lineHeight: 1, color }}>
          {value}
        </span>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.9rem", fontFamily: "var(--font-display)", fontWeight: 700 }}>/10</span>
      </div>
      <div style={{ height: "2px", background: "rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
        <div
          className="score-bar-fill"
          style={{ position: "absolute", inset: 0, background: color, width: `${pct}%`, animationDelay: `${delay + 200}ms` }}
        />
      </div>
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
    if (f.size > MAX_FILE_SIZE) return `File too large — max 10MB (yours: ${(f.size / 1024 / 1024).toFixed(1)}MB).`;
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
    b < 1024 * 1024 ? `${(b / 1024).toFixed(0)}KB` : `${(b / 1024 / 1024).toFixed(1)}MB`;

  const isLoading = status === "roasting";
  const canRoast = !!file && !isLoading;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", color: "#f0f0f0" }}>

      {/* Header */}
      <header style={{ padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "13px", color: "var(--red)", fontFamily: "var(--font-mono)", letterSpacing: "0.15em" }}>▲ RESUME</span>
          <span style={{ width: "1px", height: "14px", background: "var(--border-hover)" }} />
          <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)", letterSpacing: "0.15em", color: "rgba(255,255,255,0.5)" }}>ROASTER</span>
        </div>
        <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }}>
          GET ROASTED. GET BETTER.
        </span>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 24px 80px" }}>

        {/* Hero */}
        <div className="fade-up" style={{ textAlign: "center", marginBottom: "52px", maxWidth: "800px" }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(4rem, 11vw, 8.5rem)",
            fontWeight: 900,
            lineHeight: 0.88,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            marginBottom: "24px",
          }}>
            YOUR RESUME<br />
            DESERVES<br />
            <span style={{ color: "var(--red)", fontStyle: "italic" }}>BRUTAL</span>{" "}
            <span style={{ color: "rgba(255,255,255,0.12)" }}>HONESTY</span>
          </h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Upload it · Get roasted · Actually improve
          </p>
        </div>

        {/* Upload area */}
        <div className="fade-up" style={{ width: "100%", maxWidth: "520px", animationDelay: "0.08s" }}>

          <div
            className="bracket-box bracket-box-tr bracket-box-bl"
            onClick={() => !file && !isLoading && inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            style={{
              border: `1px solid ${dragActive ? "var(--red)" : file ? "rgba(255,107,107,0.3)" : "var(--border-hover)"}`,
              background: dragActive ? "var(--red-dim)" : "var(--surface)",
              padding: "48px 32px",
              textAlign: "center",
              cursor: file || isLoading ? "default" : "pointer",
              transition: "border-color 0.2s, background 0.2s",
              position: "relative",
            }}
          >
            <input ref={inputRef} type="file" accept={ACCEPTED_EXTENSIONS} style={{ display: "none" }} onChange={handleInputChange} />

            {file ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "44px", height: "44px", border: "1px solid var(--border-hover)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>📄</div>
                <div>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "#f0f0f0", marginBottom: "3px" }}>{file.name}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>{formatSize(file.size)}</p>
                </div>
                {!isLoading && (
                  <button
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--red)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                  >
                    × REMOVE
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "48px", height: "48px", border: "1px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: "rgba(255,255,255,0.3)" }}>↑</div>
                <div>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "6px", letterSpacing: "0.05em" }}>DRAG RESUME HERE OR CLICK TO UPLOAD</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>PDF · JPG · PNG · MAX 10MB</p>
                </div>
              </div>
            )}
          </div>

          {fileError && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--red)", marginTop: "10px", letterSpacing: "0.05em" }}>⚠ {fileError}</p>
          )}

          <button
            onClick={handleRoast}
            disabled={!canRoast}
            className={isLoading ? "pulse-red" : ""}
            style={{
              marginTop: "14px", width: "100%", padding: "20px",
              fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase",
              background: canRoast ? "var(--red)" : "var(--surface2)",
              color: canRoast ? "#fff" : "rgba(255,255,255,0.2)",
              border: "none", cursor: canRoast ? "pointer" : "not-allowed",
              transition: "background 0.15s, transform 0.1s",
            }}
            onMouseEnter={e => { if (canRoast) e.currentTarget.style.background = "#ff5252"; }}
            onMouseLeave={e => { if (canRoast) e.currentTarget.style.background = "var(--red)"; }}
            onMouseDown={e => { if (canRoast) e.currentTarget.style.transform = "scale(0.99)"; }}
            onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {isLoading
              ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                  <span style={{ display: "inline-block", animation: "spin-slow 1s linear infinite" }}>🔥</span>
                  ROASTING<span className="loading-dots" />
                </span>
              : "ROAST MY RESUME →"
            }
          </button>
        </div>

        {/* API error */}
        {status === "error" && apiError && (
          <div className="fade-up" style={{ marginTop: "20px", width: "100%", maxWidth: "520px", padding: "14px 18px", border: "1px solid rgba(255,107,107,0.3)", background: "var(--red-dim)", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--red)", letterSpacing: "0.04em" }}>
            ⚠ {apiError}
          </div>
        )}

        {/* Results */}
        {status === "done" && result && (
          <div className="fade-up" style={{ marginTop: "56px", width: "100%", maxWidth: "720px" }}>

            {/* Verdict bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)" }}>VERDICT</span>
                <span style={{ width: "1px", height: "12px", background: "var(--border-hover)" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{file?.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "2.8rem", fontWeight: 900, lineHeight: 1, color: scoreColor(result.score.overall) }}>{result.score.overall}</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem", color: "rgba(255,255,255,0.2)" }}>/10</span>
              </div>
            </div>

            {/* Roast pull-quote */}
            <div style={{ padding: "36px 32px", background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "relative" }}>
              <span style={{ position: "absolute", top: "12px", left: "22px", fontFamily: "var(--font-display)", fontSize: "5rem", fontWeight: 900, color: "var(--red)", opacity: 0.12, lineHeight: 1 }}>&ldquo;</span>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem, 3.5vw, 2rem)", fontWeight: 900, fontStyle: "italic", lineHeight: 1.2, color: "var(--red)", paddingLeft: "12px", position: "relative", zIndex: 1 }}>
                {result.roast}
              </p>
            </div>

            {/* Score grid */}
            <div style={{ padding: "28px 32px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", marginBottom: "20px" }}>SCORE BREAKDOWN</p>
              <div className="stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "20px" }}>
                {Object.entries(result.score.breakdown).map(([key, val], i) => (
                  <ScoreCell key={key} label={SCORE_LABELS[key] ?? key} value={val} delay={i * 60} />
                ))}
              </div>
            </div>

            {/* Improvements */}
            <div style={{ padding: "28px 32px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", marginBottom: "20px" }}>TOP 5 IMPROVEMENTS</p>
              <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {result.improvements.map((imp) => (
                  <div key={imp.number} style={{ display: "flex", gap: "18px", alignItems: "flex-start" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 900, lineHeight: 1, color: "rgba(255,107,107,0.18)", minWidth: "44px", textAlign: "right" }}>
                      {String(imp.number).padStart(2, "0")}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "10px", color: "#f0f0f0" }}>{imp.title}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <div style={{ padding: "10px 12px", background: "var(--red-dim)", borderLeft: "2px solid var(--red)" }}>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--red)", letterSpacing: "0.15em", marginBottom: "5px" }}>BEFORE</p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{imp.before}</p>
                        </div>
                        <div style={{ padding: "10px 12px", background: "var(--green-dim)", borderLeft: "2px solid var(--green)" }}>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--green)", letterSpacing: "0.15em", marginBottom: "5px" }}>AFTER</p>
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{imp.after}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vibe */}
            <div style={{ padding: "24px 32px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", marginBottom: "10px" }}>OVERALL VIBE</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontStyle: "italic", fontWeight: 700, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>&ldquo;{result.vibe}&rdquo;</p>
            </div>

            {/* Roast another */}
            <button
              onClick={clearFile}
              style={{ width: "100%", padding: "18px", fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", background: "transparent", color: "rgba(255,255,255,0.3)", border: "none", borderTop: "1px solid var(--border)", cursor: "pointer", transition: "color 0.15s, background 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.background = "var(--red-dim)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; e.currentTarget.style.background = "transparent"; }}
            >
              ↺ Roast Another Resume
            </button>
          </div>
        )}
      </main>

      <footer style={{ padding: "20px 32px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "rgba(255,255,255,0.15)", letterSpacing: "0.1em" }}>
          MADE WITH <span style={{ color: "var(--red)" }}>CLAUDE CODE</span>
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "rgba(255,255,255,0.1)", letterSpacing: "0.1em" }}>PDF · JPG · PNG</span>
      </footer>
    </div>
  );
}
