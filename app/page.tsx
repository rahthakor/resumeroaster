"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "landing" | "analyzing" | "results";
type Mode = "gentle" | "brutal" | "savage";
type Tone = "bad" | "warn" | "good";

interface BreakdownDim { score: number; note: string; }
interface Improvement { number: number; title: string; before: string; after: string; why: string; }
interface RoastResult {
  quote: string;
  score: {
    overall: number;
    breakdown: {
      clarity: BreakdownDim;
      impact: BreakdownDim;
      formatting: BreakdownDim;
      keywords: BreakdownDim;
      ats: BreakdownDim;
    };
  };
  improvements: Improvement[];
  vibe: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreTone(s: number): Tone { return s >= 7 ? "good" : s >= 5 ? "warn" : "bad"; }

const TONE_COLOR: Record<Tone, string> = {
  bad: "var(--crimson)",
  warn: "var(--amber)",
  good: "var(--lime)",
};

function impPriority(n: number) {
  if (n <= 2) return { label: "HIGH IMPACT", color: "var(--coral)", border: "var(--coral)" };
  if (n <= 4) return { label: "MEDIUM", color: "var(--amber)", border: "var(--amber)" };
  return { label: "LOW", color: "var(--ink-2)", border: "var(--line-2)" };
}

function verdictText(s: number): string {
  if (s <= 3) return "Critical · Rebuild needed →";
  if (s <= 5) return "Salvageable · 5 fixes →";
  if (s <= 7) return "Solid · 5 tweaks →";
  return "Strong · Minor polish →";
}

// ─── Corner brackets ──────────────────────────────────────────────────────────

function Corners() {
  const corners = [
    { key: "tl", style: { top: -1, left: -1, borderRight: "none" as const, borderBottom: "none" as const } },
    { key: "tr", style: { top: -1, right: -1, borderLeft: "none" as const, borderBottom: "none" as const } },
    { key: "bl", style: { bottom: -1, left: -1, borderRight: "none" as const, borderTop: "none" as const } },
    { key: "br", style: { bottom: -1, right: -1, borderLeft: "none" as const, borderTop: "none" as const } },
  ] as const;
  return (
    <>
      {corners.map(({ key, style }) => (
        <span key={key} style={{ position: "absolute", width: 16, height: 16, border: "1px solid var(--coral)", ...style }} />
      ))}
    </>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav({ onHome }: { onHome: () => void }) {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "22px 32px",
      borderBottom: "1px solid var(--line)",
      background: "rgba(14,14,16,0.8)",
      backdropFilter: "blur(12px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={onHome}>
        <div style={{ width: 22, height: 22, background: "var(--coral)", clipPath: "polygon(50% 0, 100% 100%, 0 100%)", flexShrink: 0 }} />
        <span className="mono" style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          <span style={{ color: "var(--coral)", fontWeight: 600 }}>Resume</span>
          <span style={{ color: "var(--ink-4)", margin: "0 6px" }}>/</span>
          <span style={{ color: "var(--ink-2)" }}>Roaster</span>
        </span>
      </div>
      <div className="mono" style={{ display: "flex", gap: 28, alignItems: "center", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>
        <span style={{ cursor: "pointer" }} onClick={onHome}>How it works</span>
        <span style={{ cursor: "pointer" }} onClick={onHome}>Examples</span>
        <span>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--ok)", boxShadow: "0 0 8px var(--ok)", marginRight: 8, verticalAlign: "middle", animation: "pulse 2s infinite" }} />
          Free forever
        </span>
      </div>
    </nav>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────

function Landing({ onSubmit }: { onSubmit: (file: File, mode: Mode) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("brutal");
  const inputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];

  function validateAndSet(f: File) {
    if (!ACCEPTED.includes(f.type)) { setFileError("Only PDF, JPG, and PNG files are accepted."); return; }
    if (f.size > 10 * 1024 * 1024) { setFileError(`Too large — max 10MB (yours: ${(f.size / 1048576).toFixed(1)}MB).`); return; }
    setFileError(null);
    setFile(f);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSet(f);
  }, []);

  const fmtSize = (b: number) => b < 1048576 ? `${(b / 1024).toFixed(0)}KB` : `${(b / 1048576).toFixed(1)}MB`;

  const MODES = [
    { id: "gentle" as Mode, num: "01", lbl: "Gentle", desc: "Honest but kind. For tender egos." },
    { id: "brutal" as Mode, num: "02", lbl: "Brutal", desc: "No mercy. The default." },
    { id: "savage" as Mode, num: "03", lbl: "Savage", desc: "Will make you cry. Worth it." },
  ];

  const STATS = [
    { num: "12,841", unit: "+", label: "Resumes Roasted" },
    { num: "4.2",    unit: "×", label: "More callbacks (median)" },
    { num: "11s",    unit: "",  label: "Avg. roast time" },
    { num: "98",     unit: "%", label: "\"Useful\" rating" },
  ];

  return (
    <div style={{ padding: "112px 32px 80px", maxWidth: 880, margin: "0 auto" }}>

      {/* Upload meta label */}
      <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 12 }}>
        <span><span style={{ color: "var(--coral)", marginRight: 8 }}>●</span>DROP YOUR RÉSUMÉ · STEP 01 / 02</span>
        <span style={{ color: "var(--ink-2)" }}>PDF · JPG · PNG · &lt;10MB</span>
      </div>

      {/* Dropzone */}
      <div
        style={{
          position: "relative",
          border: `1px ${dragging ? "solid" : "dashed"} ${dragging || file ? "var(--coral)" : "var(--line-2)"}`,
          background: dragging ? "var(--coral-soft)" : "var(--bg-2)",
          padding: file ? "20px 24px" : "64px 32px",
          minHeight: file ? undefined : 220,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: file ? "default" : "pointer",
          transition: "all 0.2s",
        }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !file && inputRef.current?.click()}
      >
        <Corners />
        <input ref={inputRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png"
          onChange={e => { const f = e.target.files?.[0]; if (f) validateAndSet(f); }} />

        {!file ? (
          <div style={{ textAlign: "center" }}>
            <div className="mono" style={{ width: 48, height: 56, margin: "0 auto 18px", border: "1px solid var(--ink-3)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.1em" }}>
              <span style={{ position: "absolute", top: 0, right: 0, width: 12, height: 12, background: "var(--bg-2)", borderLeft: "1px solid var(--ink-3)", borderBottom: "1px solid var(--ink-3)", display: "block" }} />
              PDF
            </div>
            <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Drop your résumé here</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.1em" }}>
              <span style={{ color: "var(--ink-4)", margin: "0 6px" }}>— OR —</span>
              <span style={{ color: "var(--coral)", textDecoration: "underline", textUnderlineOffset: 4, cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>browse files</span>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 18, width: "100%" }}>
            <div style={{ width: 56, height: 68, flexShrink: 0, background: "var(--bg-3)", border: "1px solid var(--line-2)", position: "relative", display: "flex", alignItems: "flex-end", padding: 6 }}>
              <span style={{ position: "absolute", top: 0, right: 0, width: 14, height: 14, background: "var(--bg-2)", borderLeft: "1px solid var(--line-2)", borderBottom: "1px solid var(--line-2)", display: "block" }} />
              <div style={{ position: "absolute", top: 18, left: 6, right: 6, display: "flex", flexDirection: "column", gap: 3 }}>
                {[100, 70, 85, 60].map((w, i) => <span key={i} style={{ height: 1, width: `${w}%`, background: "var(--ink-4)", display: "block" }} />)}
              </div>
              <span className="mono" style={{ fontSize: 9, color: "var(--coral)", letterSpacing: "0.1em", position: "relative", zIndex: 1 }}>PDF</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 13, color: "var(--ink)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.18em", textTransform: "uppercase", display: "flex", gap: 8 }}>
                <span>{fmtSize(file.size)}</span><span>·</span><span style={{ color: "var(--ok)" }}>✓ READY</span>
              </div>
            </div>
            <button className="mono"
              onClick={e => { e.stopPropagation(); setFile(null); setFileError(null); }}
              style={{ background: "transparent", border: "1px solid var(--line-2)", color: "var(--ink-2)", padding: "8px 12px", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--coral)"; e.currentTarget.style.borderColor = "var(--coral)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--ink-2)"; e.currentTarget.style.borderColor = "var(--line-2)"; }}
            >Remove</button>
          </div>
        )}
      </div>

      {fileError && <p className="mono" style={{ fontSize: 11, color: "var(--coral)", marginTop: 10 }}>⚠ {fileError}</p>}

      {/* Headline */}
      <div style={{ padding: "48px 0 8px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-space), system-ui, sans-serif", fontWeight: 700, fontSize: "clamp(36px, 5.6vw, 72px)", lineHeight: 1, letterSpacing: "-0.04em", textTransform: "uppercase", marginBottom: 18 }}>
          Your résumé deserves{" "}
          <span style={{ color: "var(--coral)", fontStyle: "italic", display: "inline-block", transform: "skew(-4deg)" }}>brutal</span>{" "}
          <span style={{ color: "transparent", WebkitTextStroke: "1.5px var(--ink-4)" }}>honesty</span>
        </h1>
        <div className="mono" style={{ fontSize: 12, letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--ink-2)", display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap" }}>
          <span>Upload it</span><span style={{ color: "var(--coral)" }}>●</span>
          <span>Get roasted</span><span style={{ color: "var(--coral)" }}>●</span>
          <span>Actually improve</span>
        </div>
      </div>

      {/* Stats strip */}
      <div className="stats-grid" style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ padding: "22px 18px", borderRight: i < 3 ? "1px solid var(--line)" : "none" }}>
            <div style={{ fontFamily: "var(--font-space), system-ui", fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}>
              {s.num}<span style={{ color: "var(--coral)" }}>{s.unit}</span>
            </div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-3)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Mode picker */}
      <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-3)", margin: "36px 0 12px" }}>
        <span>STEP 02 / 02 · Pick your roast level</span>
        <span style={{ color: "var(--ink-2)" }}>Default: brutal</span>
      </div>
      <div className="mode-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{
            border: `1px solid ${mode === m.id ? "var(--coral)" : "var(--line)"}`,
            padding: "14px 12px",
            background: mode === m.id ? "var(--coral-soft)" : "var(--bg-2)",
            color: mode === m.id ? "var(--ink)" : "var(--ink-2)",
            cursor: "pointer", transition: "all 0.15s",
            textAlign: "left", display: "flex", flexDirection: "column", gap: 6,
          }}>
            <span className="mono" style={{ fontSize: 9, color: mode === m.id ? "var(--coral)" : "var(--ink-3)", letterSpacing: "0.1em" }}>{m.num}</span>
            <span className="mono" style={{ fontWeight: 500, fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase" }}>{m.lbl}</span>
            <span className="mono" style={{ color: "var(--ink-3)", fontSize: 10, letterSpacing: "0.08em" }}>{m.desc}</span>
          </button>
        ))}
      </div>

      {/* CTA */}
      <button disabled={!file} onClick={() => file && onSubmit(file, mode)} className="mono"
        style={{ marginTop: 18, width: "100%", background: file ? "var(--coral)" : "var(--bg-3)", color: file ? "#1A0E0C" : "var(--ink-3)", border: "none", padding: "22px 24px", fontSize: 13, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600, cursor: file ? "pointer" : "not-allowed", display: "flex", justifyContent: "center", alignItems: "center", gap: 12, transition: "background 0.15s" }}
        onMouseEnter={e => { if (file) (e.currentTarget as HTMLButtonElement).style.background = "#FF8473"; }}
        onMouseLeave={e => { if (file) (e.currentTarget as HTMLButtonElement).style.background = "var(--coral)"; }}
      >
        {file ? `Roast my résumé · ${mode}` : "Upload a résumé first"}
        <span>→</span>
      </button>

      {/* Trust row */}
      <div className="mono" style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>
        {["No login", "Files deleted in 60s", "Never trained on"].map(t => (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--ok)" }}>✓</span> {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Analyzing ────────────────────────────────────────────────────────────────

function Analyzing({ fileName, result, apiError, onDone, onError }: {
  fileName: string;
  result: RoastResult | null;
  apiError: string | null;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const [pct, setPct] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const finishedRef = useRef(false);
  const pctRef = useRef(0);

  const STEPS = [
    { name: "Parsing document structure", t: "0.4s" },
    { name: "Extracting role history",    t: "1.1s" },
    { name: "Scanning ATS compatibility", t: "2.6s" },
    { name: "Stress-testing claims",      t: "4.8s" },
    { name: "Composing the roast",        t: "8.2s" },
  ];

  useEffect(() => {
    const id = setInterval(() => {
      const next = Math.min(pctRef.current + 2 + Math.random() * 4, 96);
      pctRef.current = next;
      setPct(next);
      setStepIdx(Math.min(STEPS.length - 1, Math.floor(next / 20)));
    }, 130);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (finishedRef.current) return;
    if (result) {
      finishedRef.current = true;
      setPct(100);
      setStepIdx(STEPS.length);
      setTimeout(onDone, 500);
    }
    if (apiError) {
      finishedRef.current = true;
      onError(apiError);
    }
  }, [result, apiError]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(14,14,16,0.96)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(8px)" }}>
      <div style={{ width: "min(560px, 92vw)", border: "1px solid var(--line-2)", background: "var(--bg-2)", padding: 32, position: "relative" }}>
        <Corners />
        <div className="mono" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 16 }}>Analyzing · {fileName}</span>
          <span style={{ color: "var(--coral)", flexShrink: 0 }}>● LIVE</span>
        </div>
        <div style={{ fontFamily: "var(--font-space), system-ui", fontWeight: 700, fontSize: 88, lineHeight: 1, letterSpacing: "-0.05em", color: "var(--ink)" }}>
          {Math.floor(pct)}<span style={{ color: "var(--coral)", fontSize: 32 }}>%</span>
        </div>
        <div style={{ height: 2, background: "var(--bg-3)", marginTop: 16, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, background: "var(--coral)", width: `${pct}%`, transition: "width 0.3s" }} />
        </div>
        <div className="mono" style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 14, color: i < stepIdx ? "var(--ok)" : i === stepIdx ? "var(--ink)" : "var(--ink-4)", transition: "color 0.3s", alignItems: "center" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0, display: "inline-block" }} />
              <span style={{ letterSpacing: "0.18em", textTransform: "uppercase" }}>
                {i < stepIdx ? "✓ " : i === stepIdx ? "▸ " : "  "}{s.name}
              </span>
              <span style={{ marginLeft: "auto", color: "var(--ink-4)", fontSize: 10 }}>{s.t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────

function Results({ result, fileName, mode, roastTime, onReset }: {
  result: RoastResult;
  fileName: string;
  mode: Mode;
  roastTime: number;
  onReset: () => void;
}) {
  const [shownBars, setShownBars] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setShownBars(n => (n < 5 ? n + 1 : n)), 120);
    return () => clearInterval(id);
  }, []);

  const overall = result.score.overall;
  const overallColor = TONE_COLOR[scoreTone(overall)];

  const DIMS: { key: keyof typeof result.score.breakdown; label: string }[] = [
    { key: "clarity",    label: "Clarity"  },
    { key: "impact",     label: "Impact"   },
    { key: "formatting", label: "Format"   },
    { key: "keywords",   label: "Keywords" },
    { key: "ats",        label: "ATS"      },
  ];

  return (
    <div style={{ padding: "112px 32px 80px", maxWidth: 1280, margin: "0 auto" }}>

      {/* Verdict bar */}
      <div className="mono" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, padding: "18px 0", borderTop: "1px solid var(--coral)", borderBottom: "1px solid var(--line)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", color: "var(--ink-3)", flexWrap: "wrap" }}>
          <span>Verdict</span>
          <span style={{ color: "var(--ink-4)" }}>/</span>
          <span style={{ color: "var(--ink)" }}>{fileName}</span>
          <span style={{ color: "var(--ink-4)" }}>·</span>
          <span>{mode.toUpperCase()} MODE</span>
          <span style={{ color: "var(--ink-4)" }}>·</span>
          <span>{roastTime.toFixed(1)}s</span>
        </div>
        <a className="mono" style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-2)", cursor: "pointer", transition: "color 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--coral)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--ink-2)")}
          onClick={onReset}>↻ New roast</a>
      </div>

      {/* Score hero */}
      <div className="score-hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 48, padding: "56px 0 40px", borderBottom: "1px solid var(--line)", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "var(--font-space), system-ui", fontStyle: "italic", fontSize: "clamp(20px, 2.2vw, 30px)", lineHeight: 1.2, letterSpacing: "-0.01em", color: "var(--coral)", position: "relative", paddingLeft: 32 }}>
            <span style={{ position: "absolute", left: -4, top: -20, fontSize: 80, color: "var(--coral)", opacity: 0.35, lineHeight: 1, pointerEvents: "none" }}>"</span>
            {result.quote}
          </div>
          <div className="mono" style={{ marginTop: 22, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-3)", display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["Roastbot 9000", "résumé analyzed", mode + " mode"].map(tag => (
              <span key={tag} style={{ padding: "4px 10px", border: "1px solid var(--line-2)", color: "var(--ink-2)" }}>{tag}</span>
            ))}
          </div>
        </div>
        <div style={{ position: "relative", border: "1px solid var(--line)", background: "var(--bg-2)", aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Corners />
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-3)", alignSelf: "flex-start" }}>Overall</div>
          <div style={{ fontFamily: "var(--font-space), system-ui", fontWeight: 700, fontSize: "clamp(90px, 12vw, 160px)", lineHeight: 1, letterSpacing: "-0.06em", color: overallColor, marginTop: -4 }}>
            {overall}
          </div>
          <div className="mono" style={{ fontSize: 14, color: "var(--ink-3)", letterSpacing: "0.22em", marginTop: -8 }}>/10</div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-2)", marginTop: 16, alignSelf: "flex-end", textAlign: "right" }}>
            {verdictText(overall)}
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "32px 0 18px" }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink)", display: "flex", gap: 12 }}>
          <span style={{ color: "var(--ink-4)" }}>[A]</span> Score breakdown
        </div>
        <div className="mono" style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-3)" }}>5 dimensions · weighted average</div>
      </div>
      <div className="breakdown-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", border: "1px solid var(--line)" }}>
        {DIMS.map(({ key, label }, i) => {
          const dim = result.score.breakdown[key];
          const t = scoreTone(dim.score);
          const color = TONE_COLOR[t];
          const delta = dim.score >= 7 ? "▲" : dim.score <= 4 ? "▼" : "—";
          const deltaColor = dim.score >= 7 ? "var(--ok)" : dim.score <= 4 ? "var(--crimson)" : "var(--ink-4)";
          const staggerCls = ["s1","s2","s3","s4","s5"][i];
          return (
            <div key={key} className={staggerCls} style={{ padding: "22px 20px", borderRight: i < 4 ? "1px solid var(--line)" : "none", display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{label}</span>
                <span style={{ color: deltaColor }}>{delta}</span>
              </div>
              <div style={{ fontFamily: "var(--font-space), system-ui", fontWeight: 600, fontSize: 40, lineHeight: 1, letterSpacing: "-0.03em", color }}>
                {dim.score}<span className="mono" style={{ fontSize: 12, color: "var(--ink-3)", marginLeft: 4, letterSpacing: "0.1em" }}>/10</span>
              </div>
              <div style={{ height: 3, background: "var(--bg-3)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, background: color, width: i < shownBars ? `${dim.score * 10}%` : "0%", transition: "width 0.8s ease-out" }} />
              </div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.06em", lineHeight: 1.55 }}>{dim.note}</div>
            </div>
          );
        })}
      </div>

      {/* Improvements */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "32px 0 18px" }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink)", display: "flex", gap: 12 }}>
          <span style={{ color: "var(--ink-4)" }}>[B]</span> Top 5 improvements
        </div>
        <div className="mono" style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-3)" }}>Sorted by impact</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {result.improvements.map(imp => {
          const pri = impPriority(imp.number);
          return (
            <div key={imp.number} style={{ border: "1px solid var(--line)", background: "var(--bg-2)", padding: "24px 28px", display: "grid", gridTemplateColumns: "56px 1fr", gap: 24 }}>
              <div style={{ fontFamily: "var(--font-space), system-ui", fontWeight: 600, fontSize: 36, color: "var(--ink-4)", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {String(imp.number).padStart(2, "0")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.3, flex: 1 }}>{imp.title}</div>
                  <div className="mono" style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", padding: "5px 10px", border: `1px solid ${pri.border}`, color: pri.color, flexShrink: 0 }}>{pri.label}</div>
                </div>
                <div className="diff-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}>
                  <div style={{ background: "rgba(228,88,88,0.06)", borderLeft: "2px solid var(--crimson)", padding: "16px 18px" }}>
                    <div className="mono" style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--crimson)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                      <span>BEFORE</span><span>− as written</span>
                    </div>
                    <div className="mono" style={{ fontSize: 12, lineHeight: 1.55, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>{imp.before}</div>
                  </div>
                  <div style={{ background: "rgba(107,214,138,0.05)", borderLeft: "2px solid var(--ok)", padding: "16px 18px" }}>
                    <div className="mono" style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ok)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                      <span>AFTER</span><span>+ suggested</span>
                    </div>
                    <div className="mono" style={{ fontSize: 12, lineHeight: 1.55, color: "var(--ink)", whiteSpace: "pre-wrap" }}>{imp.after}</div>
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.6, display: "flex", gap: 10 }}>
                  <span style={{ color: "var(--coral)", flexShrink: 0 }}>WHY →</span>
                  <span>{imp.why}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action row */}
      <div style={{ marginTop: 36, padding: "32px 0", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-2)", letterSpacing: "0.12em", flex: 1 }}>{result.vibe}</div>
        <button className="mono" onClick={onReset}
          style={{ background: "var(--coral)", color: "#1A0E0C", border: "none", padding: "14px 22px", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer", fontWeight: 600, transition: "background 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#FF8473")}
          onMouseLeave={e => (e.currentTarget.style.background = "var(--coral)")}
        >Roast again ↻</button>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [mode, setMode] = useState<Mode>("brutal");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<RoastResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [landingError, setLandingError] = useState<string | null>(null);
  const [roastTime, setRoastTime] = useState(0);
  const startRef = useRef(0);

  function submit(file: File, m: Mode) {
    setMode(m);
    setFileName(file.name);
    setResult(null);
    setApiError(null);
    setLandingError(null);
    startRef.current = Date.now();
    setScreen("analyzing");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", m);
    fetch("/api/roast", { method: "POST", body: fd })
      .then(r => r.json())
      .then(data => {
        if (data.error) setApiError(data.error);
        else {
          setRoastTime((Date.now() - startRef.current) / 1000);
          setResult(data);
        }
      })
      .catch(() => setApiError("Network error — please try again."));
  }

  function reset() {
    setScreen("landing");
    setResult(null);
    setApiError(null);
    setLandingError(null);
  }

  return (
    <>
      <Nav onHome={() => { if (screen !== "analyzing") reset(); }} />

      {screen === "landing" && <Landing onSubmit={submit} />}

      {screen === "analyzing" && (
        <Analyzing
          fileName={fileName}
          result={result}
          apiError={apiError}
          onDone={() => setScreen("results")}
          onError={err => { setLandingError(err); setScreen("landing"); }}
        />
      )}

      {screen === "results" && result && (
        <Results
          result={result}
          fileName={fileName}
          mode={mode}
          roastTime={roastTime}
          onReset={reset}
        />
      )}

      {landingError && screen === "landing" && (
        <div className="mono" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "12px 20px", background: "var(--bg-2)", border: "1px solid var(--coral)", color: "var(--coral)", fontSize: 12, letterSpacing: "0.1em", zIndex: 200, whiteSpace: "nowrap" }}>
          ⚠ {landingError}
        </div>
      )}

      <div className="mono" style={{ position: "fixed", bottom: 18, right: 24, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-4)", zIndex: 40 }}>
        RR · v2.4 · 2026
      </div>
    </>
  );
}
