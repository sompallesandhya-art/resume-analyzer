import { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { analyzeResume, matchResumeWithJD, rewriteResume, generateCoverLetter } from "../services/resumeService";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import FeedbackSection from "../components/FeedbackSection";

function getScoreTheme(score) {
  if (score >= 80) {
    return { stroke: "#34D399", text: "text-accent-emerald", glow: "rgba(52,211,153,0.45)", label: "Excellent" };
  }
  if (score >= 50) {
    return { stroke: "#FBBF24", text: "text-accent-amber", glow: "rgba(251,191,36,0.45)", label: "Good" };
  }
  return { stroke: "#FB7185", text: "text-accent-rose", glow: "rgba(251,113,133,0.45)", label: "Needs Improvement" };
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function downloadReport(result) {
  const doc = new jsPDF();
  const marginX = 15;
  let y = 20;

  const addWrapped = (text, fontSize = 11, gap = 7) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, 180);
    lines.forEach((line) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += gap;
    });
  };

  doc.setFontSize(18);
  doc.text("AI Resume Analysis Report", marginX, y);
  y += 12;

  doc.setFontSize(13);
  doc.text(`ATS Score: ${result.ats_score} / 100`, marginX, y);
  y += 10;

  doc.setFontSize(12);
  doc.text("Summary", marginX, y);
  y += 7;
  addWrapped(result.summary || "-");
  y += 4;

  const addList = (title, items) => {
    doc.setFontSize(12);
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(title, marginX, y);
    y += 7;
    if (!items || items.length === 0) {
      addWrapped("-");
    } else {
      items.forEach((item) => addWrapped(`• ${item}`));
    }
    y += 4;
  };

  addList("Extracted Skills", result.extracted_skills);
  addList("Missing Skills", result.missing_skills);
  addList("Strengths", result.strengths);
  addList("Weaknesses", result.weaknesses);
  addList("Suggestions", result.suggestions);

  doc.save("resume-analysis-report.pdf");
}

/* ---------- Cover letter helpers ---------- */

function buildCoverLetterText(letter) {
  const parts = [];
  if (letter.recipient) parts.push(letter.recipient);
  if (letter.subject) parts.push(`Subject: ${letter.subject}`);
  parts.push("");
  if (letter.greeting) parts.push(letter.greeting);
  parts.push("");
  if (letter.introduction) parts.push(letter.introduction);
  parts.push("");
  if (letter.body) parts.push(letter.body);
  parts.push("");
  if (letter.closing) parts.push(letter.closing);
  parts.push("");
  if (letter.signature) parts.push(letter.signature);
  return parts.join("\n");
}

async function copyCoverLetterToClipboard(letter) {
  const text = buildCoverLetterText(letter);
  await navigator.clipboard.writeText(text);
}

function downloadCoverLetterPDF(letter) {
  const doc = new jsPDF();
  const marginX = 15;
  let y = 20;

  const addWrapped = (text, fontSize = 11, gap = 6) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, 180);
    lines.forEach((line) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += gap;
    });
  };

  if (letter.recipient) {
    addWrapped(letter.recipient);
    y += 4;
  }
  if (letter.subject) {
    doc.setFontSize(13);
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(`Subject: ${letter.subject}`, marginX, y);
    y += 10;
  }
  if (letter.greeting) {
    addWrapped(letter.greeting);
    y += 6;
  }
  if (letter.introduction) {
    addWrapped(letter.introduction);
    y += 6;
  }
  if (letter.body) {
    letter.body.split("\n").forEach((para) => {
      if (para.trim().length > 0) {
        addWrapped(para);
        y += 4;
      }
    });
  }
  if (letter.closing) {
    addWrapped(letter.closing);
    y += 6;
  }
  if (letter.signature) {
    letter.signature.split("\n").forEach((line) => addWrapped(line));
  }

  doc.save("cover-letter.pdf");
}

async function downloadCoverLetterDOCX(letter) {
  const paragraphs = [];

  const addPlainParagraph = (text, spacingAfter = 200) => {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun(text)],
        spacing: { after: spacingAfter },
      })
    );
  };

  if (letter.recipient) addPlainParagraph(letter.recipient);
  if (letter.subject) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: `Subject: ${letter.subject}`, bold: true })],
        spacing: { after: 300 },
      })
    );
  }
  if (letter.greeting) addPlainParagraph(letter.greeting);
  if (letter.introduction) addPlainParagraph(letter.introduction);
  if (letter.body) {
    letter.body.split("\n").forEach((para) => {
      if (para.trim().length > 0) addPlainParagraph(para);
    });
  }
  if (letter.closing) addPlainParagraph(letter.closing);
  if (letter.signature) {
    letter.signature.split("\n").forEach((line) => addPlainParagraph(line, 100));
  }

  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "cover-letter.docx");
}

function ScoreGauge({ score }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const theme = getScoreTheme(score);

  const size = 176;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    setAnimatedScore(0);
    let frame;
    const duration = 1200;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="flex flex-col items-center">
      <span className="font-display text-sm uppercase tracking-widest text-ink-secondary mb-4">
        ATS Score
      </span>

      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          filter: `drop-shadow(0 0 18px ${theme.glow})`,
        }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            className="score-track"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            stroke={theme.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.1s linear" }}
          />
        </svg>

        <div className="absolute flex flex-col items-center">
          <span className={`font-mono text-4xl font-bold ${theme.text}`}>
            {animatedScore}
          </span>
          <span className="font-mono text-xs text-ink-faint">/100</span>
        </div>
      </div>

      <span className={`font-display text-sm font-semibold mt-4 ${theme.text}`}>
        {theme.label}
      </span>
    </div>
  );
}

/* ---------- Section icons ---------- */

function SummaryIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 12h6M9 15.5h6M9 8.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SkillsIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MissingIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.5 9.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function StrengthIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 17l6-6 4 4 8-8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h6v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WeaknessIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3l10 18H2L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SuggestionIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 18h6M10 21h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6v.5h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CopyButton({ onCopy, label = "Copy to Clipboard" }) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard permission denied or unavailable — silently ignore
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 font-display text-xs font-semibold text-ink-primary bg-ink-faint/10 hover:bg-ink-faint/15 border border-ink-faint/20 px-4 py-2 rounded-xl transition-colors"
    >
      <CopyIcon className="w-4 h-4" />
      {copied ? "Copied!" : label}
    </button>
  );
}

function PdfIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M15 2v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <text x="7" y="17" fontSize="6" fontWeight="700" fill="currentColor" stroke="none">
        PDF
      </text>
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 6h16M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6h12z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- Result section building blocks ---------- */

function SectionCard({ icon, iconTint, title, delay, children }) {
  return (
    <div
      className="glass-card rounded-2xl p-5 transition-all duration-300 hover:border-ink-faint/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 animate-fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconTint}`}>
          {icon}
        </span>
        <h3 className="font-display text-xs uppercase tracking-widest text-ink-secondary">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function PillList({ items, tone }) {
  const toneClasses =
    tone === "positive"
      ? "bg-accent-emerald/12 text-accent-emerald border-accent-emerald/25"
      : "bg-accent-rose/12 text-accent-rose border-accent-rose/25";

  if (!items || items.length === 0) {
    return <p className="font-body text-ink-faint text-sm">None found</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span
          key={i}
          className={`font-body text-xs px-3 py-1.5 rounded-full border transition-transform duration-200 hover:scale-105 ${toneClasses}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function TextList({ items, bulletClass }) {
  return (
    <ul className="space-y-2">
      {items?.map((item, i) => (
        <li key={i} className="font-body text-sm text-ink-primary flex gap-2 leading-relaxed">
          <span className={bulletClass}>•</span> {item}
        </li>
      ))}
    </ul>
  );
}

/* ---------- Upload zone ---------- */

function UploadZone({ file, isDragActive, onDragOver, onDragLeave, onDrop, onClick, onRemove, fileInputRef, onFileInputChange }) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={!file ? onClick : undefined}
      className={`glass-card rounded-2xl px-6 py-10 sm:py-12 text-center transition-all duration-300 ${
        !file ? "cursor-pointer" : ""
      } ${
        isDragActive
          ? "border-2 border-accent-violet bg-accent-violet/10 scale-[1.01]"
          : "border-2 border-dashed border-ink-faint/25 hover:border-accent-violet/50"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={onFileInputChange}
        className="hidden"
      />

      {file ? (
        <div className="flex flex-col items-center gap-3 animate-fade-up">
          <div className="w-14 h-14 rounded-full bg-accent-emerald/15 flex items-center justify-center text-accent-emerald relative">
            <PdfIcon className="w-7 h-7" />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent-emerald flex items-center justify-center">
              <CheckIcon className="w-3.5 h-3.5 text-base-deep" />
            </span>
          </div>

          <div className="min-w-0">
            <p className="font-body text-ink-primary text-sm font-medium break-all">
              {file.name}
            </p>
            <p className="font-mono text-ink-faint text-xs mt-1">
              {formatFileSize(file.size)}
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex items-center gap-1.5 text-accent-rose/80 hover:text-accent-rose font-body text-xs mt-1 px-3 py-1.5 rounded-lg hover:bg-accent-rose/10 transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            Remove file
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div
            className={`w-14 h-14 rounded-full bg-accent-violet/15 flex items-center justify-center text-accent-violet transition-transform duration-300 ${
              isDragActive ? "scale-110 -translate-y-1" : ""
            }`}
          >
            <PdfIcon className="w-7 h-7" />
          </div>

          <div>
            <p className="font-body text-ink-primary text-sm sm:text-base font-medium">
              {isDragActive ? "Drop your PDF here" : "Drag & drop your resume here"}
            </p>
            <p className="font-body text-ink-faint text-xs sm:text-sm mt-1">
              or click to browse — PDF only
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function JobDescriptionCard({ value, onChange }) {
  return (
    <div className="glass-card rounded-2xl p-5 mt-4 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-xs uppercase tracking-widest text-ink-secondary">
          Job Description
        </h3>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="font-body text-xs text-ink-faint hover:text-accent-rose transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the Job Description here..."
        rows={6}
        className="w-full resize-y min-h-[120px] sm:min-h-[150px] bg-ink-faint/8 border border-ink-faint/20 rounded-xl px-4 py-3 font-body text-sm text-ink-primary placeholder:text-ink-faint focus:outline-none focus:border-accent-violet/50 transition-colors"
      />

      <div className="flex justify-end mt-2">
        <span className="font-mono text-xs text-ink-faint">
          {value.length} characters
        </span>
      </div>
    </div>
  );
}

function OnboardingCard() {
  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 mb-6 animate-fade-up">
      <h2 className="font-display font-semibold text-sm uppercase tracking-widest text-ink-secondary mb-4">
        How to use this app
      </h2>

      <ol className="space-y-2 mb-6">
        <li className="font-body text-sm text-ink-primary flex gap-2">
          <span className="font-mono text-accent-violet">1.</span>
          Upload your resume (PDF).
        </li>
        <li className="font-body text-sm text-ink-primary flex gap-2">
          <span className="font-mono text-accent-violet">2.</span>
          Paste the Job Description — optional, but required for Resume Match and Cover Letter.
        </li>
        <li className="font-body text-sm text-ink-primary flex gap-2">
          <span className="font-mono text-accent-violet">3.</span>
          Choose one of the AI features below.
        </li>
      </ol>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4">
          <p className="font-display text-xs font-semibold text-accent-violet mb-1">
            Analyze Resume
          </p>
          <p className="font-body text-xs text-ink-faint leading-relaxed">
            ATS score, strengths, weaknesses, and suggestions.
          </p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="font-display text-xs font-semibold text-accent-violet mb-1">
            Resume vs Job Description Match
          </p>
          <p className="font-body text-xs text-ink-faint leading-relaxed">
            Match score, missing skills, and keyword analysis.
          </p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="font-display text-xs font-semibold text-accent-emerald mb-1">
            AI Resume Rewrite
          </p>
          <p className="font-body text-xs text-ink-faint leading-relaxed">
            An improved, ATS-friendly version of your resume.
          </p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="font-display text-xs font-semibold text-accent-amber mb-1">
            AI Cover Letter
          </p>
          <p className="font-body text-xs text-ink-faint leading-relaxed">
            A personalized cover letter for the job you're applying to.
          </p>
        </div>
      </div>
    </div>
  );
}

const SAMPLE_REPORT_DATA = {
  ats_score: 82,
  summary:
    "A solid mid-level software engineering profile with strong hands-on project experience. The resume communicates technical breadth well but could better quantify impact and surface keywords that ATS systems commonly scan for.",
  extracted_skills: ["Python", "React", "SQL", "Git", "REST APIs", "Docker"],
  missing_skills: ["CI/CD", "Unit Testing", "Cloud (AWS/GCP)"],
  strengths: [
    "Clear, chronological work history with consistent formatting",
    "Relevant technical skills listed and easy to scan",
    "Project descriptions show hands-on, practical experience",
  ],
  weaknesses: [
    "Bullet points describe tasks rather than measurable outcomes",
    "No quantified metrics (%, numbers, scale) in most bullet points",
    "Missing a few commonly-expected keywords for this role",
  ],
  suggestions: [
    "Add measurable outcomes to at least 3 bullet points (e.g. \"reduced load time by 30%\")",
    "Include a short skills-summary line near the top for faster ATS parsing",
    "Add any cloud or testing experience, even from personal projects",
  ],
};

function DemoReport() {
  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/40 mb-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
        <h2 className="font-display font-semibold text-sm uppercase tracking-widest text-ink-secondary">
          See it in action
        </h2>
        <span className="font-body text-xs font-medium text-accent-amber bg-accent-amber/10 border border-accent-amber/25 px-3 py-1 rounded-full">
          👁 Sample Output — this is not your data
        </span>
      </div>

      <div className="space-y-6">
        <div className="glass-card rounded-2xl p-6 flex justify-center">
          <ScoreGauge score={SAMPLE_REPORT_DATA.ats_score} />
        </div>

        <SectionCard
          icon={<SummaryIcon className="w-4 h-4" />}
          iconTint="bg-accent-violet/15 text-accent-violet"
          title="Summary"
          delay={0}
        >
          <p className="font-body text-ink-primary text-sm leading-relaxed">
            {SAMPLE_REPORT_DATA.summary}
          </p>
        </SectionCard>

        <div className="grid sm:grid-cols-2 gap-4">
          <SectionCard
            icon={<SkillsIcon className="w-4 h-4" />}
            iconTint="bg-accent-emerald/15 text-accent-emerald"
            title="Extracted Skills"
            delay={0}
          >
            <PillList items={SAMPLE_REPORT_DATA.extracted_skills} tone="positive" />
          </SectionCard>

          <SectionCard
            icon={<MissingIcon className="w-4 h-4" />}
            iconTint="bg-accent-rose/15 text-accent-rose"
            title="Missing Skills"
            delay={0}
          >
            <PillList items={SAMPLE_REPORT_DATA.missing_skills} tone="negative" />
          </SectionCard>

          <SectionCard
            icon={<StrengthIcon className="w-4 h-4" />}
            iconTint="bg-accent-emerald/15 text-accent-emerald"
            title="Strengths"
            delay={0}
          >
            <TextList items={SAMPLE_REPORT_DATA.strengths} bulletClass="text-accent-emerald" />
          </SectionCard>

          <SectionCard
            icon={<WeaknessIcon className="w-4 h-4" />}
            iconTint="bg-accent-amber/15 text-accent-amber"
            title="Weaknesses"
            delay={0}
          >
            <TextList items={SAMPLE_REPORT_DATA.weaknesses} bulletClass="text-accent-amber" />
          </SectionCard>
        </div>

        <SectionCard
          icon={<SuggestionIcon className="w-4 h-4" />}
          iconTint="bg-accent-violet/15 text-accent-violet"
          title="Suggestions"
          delay={0}
        >
          <TextList items={SAMPLE_REPORT_DATA.suggestions} bulletClass="text-accent-violet" />
        </SectionCard>
      </div>

      <div className="mt-6 pt-6 border-t border-ink-faint/20 text-center">
        <p className="font-display font-semibold text-ink-primary text-sm">
          🚀 Ready to analyze your own resume?
        </p>
        <p className="font-body text-ink-secondary text-xs mt-1">
          This is a sample report. Upload your resume below to generate your own AI analysis.
        </p>
      </div>
    </div>
  );
}

function Header({ userEmail, onLogout }) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-base-deep/70 border-b border-ink-faint/15">
      <div className="max-w-3xl mx-auto px-4 sm:px-0 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-violet flex items-center justify-center font-display font-bold text-white text-sm">
            RA
          </div>
          <div>
            <p className="font-display font-semibold text-ink-primary text-sm leading-tight">
              Resume Analyzer
            </p>
            <p className="font-body text-ink-faint text-xs leading-tight">
              AI-powered ATS scoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden sm:inline font-body text-xs text-ink-faint">
              {userEmail}
            </span>
          )}
          <ThemeToggle />
          <button
            onClick={onLogout}
            className="font-body text-xs font-medium text-ink-secondary hover:text-accent-rose border border-ink-faint/25 hover:border-accent-rose/40 px-3 py-1.5 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-faint/20">
      <div className="max-w-3xl mx-auto px-4 sm:px-0 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="font-body text-ink-faint text-xs">
          © {new Date().getFullYear()} Resume Analyzer. All rights reserved.
        </p>
        <p className="font-body text-ink-faint text-xs">
          Built with FastAPI &amp; Groq
        </p>
      </div>
    </footer>
  );
}

function Dashboard() {
  const { user, signOut } = useAuth();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [jdMatchResult, setJdMatchResult] = useState(null);
  const [jdMatchLoading, setJdMatchLoading] = useState(false);
  const [jdMatchError, setJdMatchError] = useState("");
  const [rewriteResult, setRewriteResult] = useState(null);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteError, setRewriteError] = useState("");
  const [coverLetterResult, setCoverLetterResult] = useState(null);
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [coverLetterError, setCoverLetterError] = useState("");
  const fileInputRef = useRef(null);

  const validateAndSetFile = (candidateFile) => {
    if (!candidateFile) return;
    if (candidateFile.type !== "application/pdf") {
      setError("Only PDF files are supported. Please drop a .pdf file.");
      return;
    }
    setError("");
    setFile(candidateFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileInputChange = (e) => {
    validateAndSetFile(e.target.files[0]);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setResult(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      alert("Please select a PDF file.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await analyzeResume(file);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleMatchJD = async () => {
    if (!file || jobDescription.trim().length === 0) {
      return;
    }

    setJdMatchLoading(true);
    setJdMatchError("");
    setJdMatchResult(null);

    try {
      const data = await matchResumeWithJD(file, jobDescription);
      setJdMatchResult(data);
    } catch (err) {
      setJdMatchError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setJdMatchLoading(false);
    }
  };

  const handleRewrite = async () => {
    if (!file) {
      return;
    }

    setRewriteLoading(true);
    setRewriteError("");
    setRewriteResult(null);

    try {
      const data = await rewriteResume(file, jobDescription);
      setRewriteResult(data);
    } catch (err) {
      setRewriteError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setRewriteLoading(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!file || jobDescription.trim().length === 0) {
      return;
    }

    setCoverLetterLoading(true);
    setCoverLetterError("");
    setCoverLetterResult(null);

    try {
      const data = await generateCoverLetter(file, jobDescription);
      setCoverLetterResult(data);
    } catch (err) {
      setCoverLetterError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setCoverLetterLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-base-deep via-base-mid to-base-deep">
      <Header userEmail={user?.email} onLogout={handleLogout} />

      <main className="flex-1 px-4 py-10 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-primary tracking-tight">
              AI Resume Analyzer
            </h1>
            <p className="font-body text-ink-secondary mt-2 text-sm sm:text-base">
              Upload your resume. Get a machine-eye read in seconds.
            </p>
          </div>

          <OnboardingCard />

          {!result && !jdMatchResult && !rewriteResult && !coverLetterResult && (
            <DemoReport />
          )}

          <div className="glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/40">
            <UploadZone
              file={file}
              isDragActive={isDragActive}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onRemove={handleRemoveFile}
              fileInputRef={fileInputRef}
              onFileInputChange={handleFileInputChange}
            />

            <JobDescriptionCard value={jobDescription} onChange={setJobDescription} />

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div>
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !file}
                  className="w-full font-display font-semibold bg-accent-violet hover:bg-accent-violet/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-colors"
                >
                  {loading ? "Analyzing..." : "Analyze Resume"}
                </button>
                <p className="font-body text-xs text-ink-faint mt-1.5 px-1">
                  Use this to get your ATS score and general resume feedback.
                </p>
              </div>

              <div>
                <button
                  onClick={handleMatchJD}
                  disabled={!file || jobDescription.trim().length === 0 || jdMatchLoading}
                  className="w-full font-display font-semibold bg-transparent border border-accent-violet/50 text-accent-violet hover:bg-accent-violet/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:border-ink-faint/25 disabled:text-ink-faint px-6 py-3 rounded-xl transition-colors"
                >
                  {jdMatchLoading ? "Matching..." : "Resume vs Job Description Match"}
                </button>
                <p className="font-body text-xs text-ink-faint mt-1.5 px-1">
                  Use this to see how well your resume fits a specific job.
                </p>
              </div>

              <div>
                <button
                  onClick={handleRewrite}
                  disabled={!file || rewriteLoading}
                  className="w-full font-display font-semibold bg-transparent border border-accent-emerald/50 text-accent-emerald hover:bg-accent-emerald/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:border-ink-faint/25 disabled:text-ink-faint px-6 py-3 rounded-xl transition-colors"
                >
                  {rewriteLoading ? "Rewriting..." : "AI Resume Rewrite"}
                </button>
                <p className="font-body text-xs text-ink-faint mt-1.5 px-1">
                  Use this to get an improved, ATS-friendly version of your resume.
                </p>
              </div>

              <div>
                <button
                  onClick={handleGenerateCoverLetter}
                  disabled={!file || jobDescription.trim().length === 0 || coverLetterLoading}
                  className="w-full font-display font-semibold bg-transparent border border-accent-amber/50 text-accent-amber hover:bg-accent-amber/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:border-ink-faint/25 disabled:text-ink-faint px-6 py-3 rounded-xl transition-colors"
                >
                  {coverLetterLoading ? "Generating..." : "AI Cover Letter"}
                </button>
                <p className="font-body text-xs text-ink-faint mt-1.5 px-1">
                  Use this to generate a personalized cover letter for this job.
                </p>
              </div>
            </div>

            {!file && (
              <p className="mt-4 font-body text-xs text-accent-amber flex items-center gap-1.5">
                <span>⚠</span> Upload your resume to enable AI features.
              </p>
            )}

            {file && jobDescription.trim().length === 0 && (
              <p className="mt-4 font-body text-xs text-accent-amber flex items-center gap-1.5">
                <span>⚠</span> Add a Job Description to unlock Resume Match and Cover Letter.
              </p>
            )}

            {loading && (
              <div className="mt-6 flex items-center gap-3 text-ink-secondary font-body text-sm">
                <span className="h-2 w-2 rounded-full bg-accent-violet animate-pulse" />
                Analyzing Resume...
              </div>
            )}

            {error && (
              <p className="mt-6 text-accent-rose font-body text-sm">{error}</p>
            )}

            {jdMatchLoading && (
              <div className="mt-6 flex items-center gap-3 text-ink-secondary font-body text-sm">
                <span className="h-2 w-2 rounded-full bg-accent-violet animate-pulse" />
                Matching resume against job description...
              </div>
            )}

            {jdMatchError && (
              <p className="mt-6 text-accent-rose font-body text-sm">{jdMatchError}</p>
            )}

            {rewriteLoading && (
              <div className="mt-6 flex items-center gap-3 text-ink-secondary font-body text-sm">
                <span className="h-2 w-2 rounded-full bg-accent-emerald animate-pulse" />
                Rewriting your resume with AI...
              </div>
            )}

            {rewriteError && (
              <p className="mt-6 text-accent-rose font-body text-sm">{rewriteError}</p>
            )}

            {coverLetterLoading && (
              <div className="mt-6 flex items-center gap-3 text-ink-secondary font-body text-sm">
                <span className="h-2 w-2 rounded-full bg-accent-amber animate-pulse" />
                Writing your cover letter...
              </div>
            )}

            {coverLetterError && (
              <p className="mt-6 text-accent-rose font-body text-sm">{coverLetterError}</p>
            )}

            {result && (
              <div className="mt-10 space-y-6">
                <div className="flex justify-end animate-fade-up">
                  <button
                    onClick={() => downloadReport(result)}
                    className="flex items-center gap-2 font-display text-xs font-semibold text-ink-primary bg-ink-faint/10 hover:bg-ink-faint/15 border border-ink-faint/20 px-4 py-2 rounded-xl transition-colors"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    Download Report (PDF)
                  </button>
                </div>

                <div
                  className="glass-card rounded-2xl p-6 flex justify-center transition-all duration-300 hover:border-ink-faint/30 animate-fade-up"
                  style={{ animationDelay: "60ms", animationFillMode: "backwards" }}
                >
                  <ScoreGauge score={result.ats_score} />
                </div>

                <SectionCard
                  icon={<SummaryIcon className="w-4 h-4" />}
                  iconTint="bg-accent-violet/15 text-accent-violet"
                  title="Summary"
                  delay={100}
                >
                  <p className="font-body text-ink-primary text-sm leading-relaxed">
                    {result.summary}
                  </p>
                </SectionCard>

                <div className="grid sm:grid-cols-2 gap-4">
                  <SectionCard
                    icon={<SkillsIcon className="w-4 h-4" />}
                    iconTint="bg-accent-emerald/15 text-accent-emerald"
                    title="Extracted Skills"
                    delay={140}
                  >
                    <PillList items={result.extracted_skills} tone="positive" />
                  </SectionCard>

                  <SectionCard
                    icon={<MissingIcon className="w-4 h-4" />}
                    iconTint="bg-accent-rose/15 text-accent-rose"
                    title="Missing Skills"
                    delay={180}
                  >
                    <PillList items={result.missing_skills} tone="negative" />
                  </SectionCard>

                  <SectionCard
                    icon={<StrengthIcon className="w-4 h-4" />}
                    iconTint="bg-accent-emerald/15 text-accent-emerald"
                    title="Strengths"
                    delay={220}
                  >
                    <TextList items={result.strengths} bulletClass="text-accent-emerald" />
                  </SectionCard>

                  <SectionCard
                    icon={<WeaknessIcon className="w-4 h-4" />}
                    iconTint="bg-accent-amber/15 text-accent-amber"
                    title="Weaknesses"
                    delay={260}
                  >
                    <TextList items={result.weaknesses} bulletClass="text-accent-amber" />
                  </SectionCard>
                </div>

                <SectionCard
                  icon={<SuggestionIcon className="w-4 h-4" />}
                  iconTint="bg-accent-violet/15 text-accent-violet"
                  title="Suggestions"
                  delay={300}
                >
                  <TextList items={result.suggestions} bulletClass="text-accent-violet" />
                </SectionCard>
              </div>
            )}

            {jdMatchResult && (
              <div className="mt-10 space-y-6">
                <div className="glass-card rounded-2xl p-6 flex justify-center animate-fade-up">
                  <ScoreGauge score={jdMatchResult.match_score} />
                </div>

                <SectionCard
                  icon={<SkillsIcon className="w-4 h-4" />}
                  iconTint="bg-accent-emerald/15 text-accent-emerald"
                  title="Matching Skills"
                  delay={100}
                >
                  <PillList items={jdMatchResult.matching_skills} tone="positive" />
                </SectionCard>

                <SectionCard
                  icon={<MissingIcon className="w-4 h-4" />}
                  iconTint="bg-accent-rose/15 text-accent-rose"
                  title="Missing Skills"
                  delay={140}
                >
                  <PillList items={jdMatchResult.missing_skills} tone="negative" />
                </SectionCard>

                <div className="grid sm:grid-cols-2 gap-4">
                  <SectionCard
                    icon={<StrengthIcon className="w-4 h-4" />}
                    iconTint="bg-accent-emerald/15 text-accent-emerald"
                    title="Strengths"
                    delay={180}
                  >
                    <TextList items={jdMatchResult.strengths} bulletClass="text-accent-emerald" />
                  </SectionCard>

                  <SectionCard
                    icon={<WeaknessIcon className="w-4 h-4" />}
                    iconTint="bg-accent-amber/15 text-accent-amber"
                    title="Gaps"
                    delay={220}
                  >
                    <TextList items={jdMatchResult.gaps} bulletClass="text-accent-amber" />
                  </SectionCard>
                </div>

                <SectionCard
                  icon={<SuggestionIcon className="w-4 h-4" />}
                  iconTint="bg-accent-violet/15 text-accent-violet"
                  title="Recommendation"
                  delay={260}
                >
                  <p className="font-body text-ink-primary text-sm leading-relaxed">
                    {jdMatchResult.recommendation}
                  </p>
                </SectionCard>
              </div>
            )}

            {rewriteResult && (
              <div className="mt-10 space-y-6">
                <SectionCard
                  icon={<SummaryIcon className="w-4 h-4" />}
                  iconTint="bg-accent-emerald/15 text-accent-emerald"
                  title="Professional Summary"
                  delay={60}
                >
                  <p className="font-body text-ink-primary text-sm leading-relaxed">
                    {rewriteResult.professional_summary}
                  </p>
                </SectionCard>

                <SectionCard
                  icon={<StrengthIcon className="w-4 h-4" />}
                  iconTint="bg-accent-emerald/15 text-accent-emerald"
                  title="Improved Experience"
                  delay={100}
                >
                  <TextList items={rewriteResult.improved_experience} bulletClass="text-accent-emerald" />
                </SectionCard>

                <SectionCard
                  icon={<StrengthIcon className="w-4 h-4" />}
                  iconTint="bg-accent-emerald/15 text-accent-emerald"
                  title="Improved Projects"
                  delay={140}
                >
                  <TextList items={rewriteResult.improved_projects} bulletClass="text-accent-emerald" />
                </SectionCard>

                <SectionCard
                  icon={<SkillsIcon className="w-4 h-4" />}
                  iconTint="bg-accent-emerald/15 text-accent-emerald"
                  title="Improved Skills"
                  delay={180}
                >
                  <PillList items={rewriteResult.improved_skills} tone="positive" />
                </SectionCard>

                <SectionCard
                  icon={<SkillsIcon className="w-4 h-4" />}
                  iconTint="bg-accent-violet/15 text-accent-violet"
                  title="Keyword Suggestions"
                  delay={220}
                >
                  <PillList items={rewriteResult.keyword_suggestions} tone="positive" />
                </SectionCard>

                <SectionCard
                  icon={<SuggestionIcon className="w-4 h-4" />}
                  iconTint="bg-accent-violet/15 text-accent-violet"
                  title="Final Resume Tips"
                  delay={260}
                >
                  <TextList items={rewriteResult.final_resume_tips} bulletClass="text-accent-violet" />
                </SectionCard>
              </div>
            )}

            {coverLetterResult && (
              <div className="mt-10 space-y-6">
                <div className="flex flex-wrap justify-end gap-2 animate-fade-up">
                  <CopyButton onCopy={() => copyCoverLetterToClipboard(coverLetterResult)} />
                  <button
                    onClick={() => downloadCoverLetterPDF(coverLetterResult)}
                    className="flex items-center gap-2 font-display text-xs font-semibold text-ink-primary bg-ink-faint/10 hover:bg-ink-faint/15 border border-ink-faint/20 px-4 py-2 rounded-xl transition-colors"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => downloadCoverLetterDOCX(coverLetterResult)}
                    className="flex items-center gap-2 font-display text-xs font-semibold text-ink-primary bg-ink-faint/10 hover:bg-ink-faint/15 border border-ink-faint/20 px-4 py-2 rounded-xl transition-colors"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    Download DOCX
                  </button>
                </div>

                <SectionCard
                  icon={<SummaryIcon className="w-4 h-4" />}
                  iconTint="bg-accent-amber/15 text-accent-amber"
                  title="Cover Letter"
                  delay={60}
                >
                  <div className="space-y-4 font-body text-sm text-ink-primary leading-relaxed">
                    {coverLetterResult.recipient && (
                      <p className="text-ink-secondary">{coverLetterResult.recipient}</p>
                    )}
                    {coverLetterResult.subject && (
                      <p className="font-semibold">{`Subject: ${coverLetterResult.subject}`}</p>
                    )}
                    {coverLetterResult.greeting && <p>{coverLetterResult.greeting}</p>}
                    {coverLetterResult.introduction && <p>{coverLetterResult.introduction}</p>}
                    {coverLetterResult.body &&
                      coverLetterResult.body
                        .split("\n")
                        .filter((para) => para.trim().length > 0)
                        .map((para, i) => <p key={i}>{para}</p>)}
                    {coverLetterResult.closing && <p>{coverLetterResult.closing}</p>}
                    {coverLetterResult.signature &&
                      coverLetterResult.signature
                        .split("\n")
                        .map((line, i) => <p key={i}>{line}</p>)}
                  </div>
                </SectionCard>
              </div>
            )}
          </div>

          <FeedbackSection />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Dashboard;
