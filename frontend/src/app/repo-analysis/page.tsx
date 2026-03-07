"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Loader2, ArrowRight, CheckCircle2, FileCode2,
    FlaskConical, LayoutTemplate, ShieldAlert, Sparkles,
    GitBranch, Shield, Zap, RotateCcw, TrendingUp,
    LayoutDashboard, Activity, ShieldCheck, Database, Settings,
    Command, User, Bell, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { ThreeDScene } from "@/components/ThreeDScene";
import { CrossFeatureNav } from "@/components/CrossFeatureNav";
import { Footer } from "@/components/Footer";

// ─── Sidebar nav items (mirrors InteractiveDashboard) ─────────────────────────
const reportNavItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: "Overview" },
    { icon: <Activity className="w-4 h-4" />, label: "Analytics" },
    { icon: <GitBranch className="w-4 h-4" />, label: "Repositories" },
    { icon: <ShieldCheck className="w-4 h-4" />, label: "Security" },
    { icon: <Database className="w-4 h-4" />, label: "Data" },
    { icon: <Settings className="w-4 h-4" />, label: "Settings" },
];

type JobState = "idle" | "processing" | "complete" | "error";

// ─── Animated health score ring ───────────────────────────────────────────────
function HealthRing({ score, inView }: { score: string; inView: boolean }) {
    const gradeColor: Record<string, { stroke: string; glow: string; text: string }> = {
        "A+": { stroke: "#10b981", glow: "rgba(16,185,129,0.25)", text: "text-emerald-600" },
        "A": { stroke: "#10b981", glow: "rgba(16,185,129,0.20)", text: "text-emerald-600" },
        "B+": { stroke: "#6366f1", glow: "rgba(99,102,241,0.25)", text: "text-indigo-600" },
        "B": { stroke: "#6366f1", glow: "rgba(99,102,241,0.20)", text: "text-indigo-600" },
        "C": { stroke: "#f59e0b", glow: "rgba(245,158,11,0.25)", text: "text-amber-600" },
        "D": { stroke: "#f43f5e", glow: "rgba(244,63,94,0.25)", text: "text-rose-600" },
        "F": { stroke: "#ef4444", glow: "rgba(239,68,68,0.25)", text: "text-red-600" },
    };
    const c = gradeColor[score] ?? gradeColor["B+"];
    const r = 52, cx = 64, cy = 64, circum = 2 * Math.PI * r;
    // map grade to a 0-100 fill percent
    const pct: Record<string, number> = { "A+": 100, "A": 92, "B+": 82, "B": 74, "C": 60, "D": 42, "F": 20 };
    const fill = ((pct[score] ?? 75) / 100) * circum;

    return (
        <div className="relative flex items-center justify-center" style={{ filter: `drop-shadow(0 0 20px ${c.glow})` }}>
            <svg width={128} height={128} viewBox="0 0 128 128">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={10} />
                <motion.circle
                    cx={cx} cy={cy} r={r}
                    fill="none"
                    stroke={c.stroke}
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray={`${circum}`}
                    strokeDashoffset={circum}
                    style={{ transform: "rotate(-90deg)", transformOrigin: "64px 64px" }}
                    animate={inView ? { strokeDashoffset: circum - fill } : { strokeDashoffset: circum }}
                    transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className={`text-4xl font-black tracking-tighter ${c.text}`}>{score}</span>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">Health</span>
            </div>
        </div>
    );
}

// ─── Step progress indicator ──────────────────────────────────────────────────
const STEPS = [
    { icon: <GitBranch className="w-4 h-4" />, label: "Cloning repo" },
    { icon: <FileCode2 className="w-4 h-4" />, label: "Parsing files" },
    { icon: <Zap className="w-4 h-4" />, label: "Embedding vectors" },
    { icon: <Shield className="w-4 h-4" />, label: "AI analysis" },
];

function StepTracker({ progress }: { progress: number }) {
    const activeStep = progress <= 30 ? 0 : progress <= 60 ? 1 : progress <= 85 ? 2 : 3;
    return (
        <div className="flex items-center gap-0 w-full max-w-sm">
            {STEPS.map((step, i) => {
                const done = i < activeStep;
                const active = i === activeStep;
                return (
                    <div key={i} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-1">
                            <motion.div
                                animate={{
                                    backgroundColor: done ? "#6366f1" : active ? "#6366f1" : "#e2e8f0",
                                    scale: active ? 1.15 : 1,
                                }}
                                transition={{ duration: 0.3 }}
                                className="w-8 h-8 rounded-full flex items-center justify-center border-2"
                                style={{ borderColor: done || active ? "#6366f1" : "#e2e8f0" }}
                            >
                                {done ? (
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                ) : (
                                    <span className={active ? "text-white" : "text-slate-400"}>{step.icon}</span>
                                )}
                            </motion.div>
                            <span className={`text-[9px] font-semibold whitespace-nowrap ${done || active ? "text-indigo-600" : "text-slate-400"
                                }`}>{step.label}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className="flex-1 h-0.5 mb-4 mx-1 relative overflow-hidden rounded-full bg-slate-200">
                                <motion.div
                                    className="h-full bg-indigo-500 rounded-full"
                                    animate={{ width: done ? "100%" : "0%" }}
                                    transition={{ duration: 0.4 }}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function RepoAnalysisDashboard() {
    const [url, setUrl] = useState("");
    const [jobState, setJobState] = useState<JobState>("idle");
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");
    const [error, setError] = useState("");
    const [jobId, setJobId] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);

    const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api`;
    const API_KEY  = process.env.NEXT_PUBLIC_API_KEY || "";

    const apiFetch = (path: string, init: RequestInit = {}) => {
        const headers = new Headers(init.headers);
        headers.set("Content-Type", "application/json");
        if (API_KEY) headers.set("X-API-Key", API_KEY);
        return fetch(`${API_BASE}${path}`, { ...init, headers });
    };

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.includes("github.com")) {
            setError("Please enter a valid GitHub repository URL");
            return;
        }
        setError("");
        setJobState("processing");
        setProgress(5);
        setStatusMessage("Connecting to API...");
        window.scrollTo({ top: 0, behavior: "smooth" });
        try {
            const res = await apiFetch(`/analyze`, {
                method: "POST",
                body: JSON.stringify({ url }),
            });
            if (!res.ok) throw new Error("Failed to start analysis");
            const data = await res.json();
            setJobId(data.job_id);
        } catch {
            setError("Backend connection failed. Is the Python API running?");
            setJobState("error");
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        const checkStatus = async () => {
            if (!jobId) return;
            try {
                const res = await apiFetch(`/jobs/${jobId}/status`);
                const data = await res.json();
                setProgress(data.progress);
                setStatusMessage(data.message);
                if (data.status === "COMPLETED") {
                    setResult(data.result);
                    setJobState("complete");
                    clearInterval(interval);
                } else if (data.status === "FAILED") {
                    setError(data.message);
                    setJobState("error");
                    clearInterval(interval);
                }
            } catch {
                console.error("Polling error");
            }
        };
        if (jobState === "processing" && jobId) interval = setInterval(checkStatus, 3000);
        return () => clearInterval(interval);
    }, [jobId, jobState]);

    return (
        <div className="min-h-screen bg-grid-white relative overflow-x-hidden">
            <Navbar />

            {/* ── Ambient background blobs (same as landing) ── */}
            {/* <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-indigo-100/40 blur-[120px]" />
                <div className="absolute top-[40%] -right-60 w-[500px] h-[500px] rounded-full bg-violet-100/30 blur-[100px]" />
                <div className="absolute top-[60%] -left-60 w-[400px] h-[400px] rounded-full bg-sky-100/30 blur-[100px]" />
            </div> */}

            <main className="flex-1 w-full max-w-6xl mx-auto px-6 pt-32 pb-24 relative z-10 flex flex-col items-center">

                {/* ── IDLE / ERROR state ── */}
                <AnimatePresence mode="wait">
                    {(jobState === "idle" || jobState === "error") && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full flex flex-col items-center text-center pt-8 relative"
                        >
                            {/* 3D scene behind hero text */}
                            <ThreeDScene />
                            {/* Grid fade mask */}
                            {/* <div className="absolute top-0 left-0 w-full h-[420px] bg-gradient-to-b from-white/50 via-white/30 to-transparent pointer-events-none z-0" /> */}

                            <div className="relative z-10 flex flex-col items-center">
                                {/* Badge */}
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 }}
                                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-sm font-medium text-slate-600 mb-8"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Deep Repository Scanner</span>
                                    <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold">
                                        Powered by Groq <ArrowRight className="w-3 h-3" />
                                    </span>
                                </motion.div>

                                {/* Headline */}
                                <motion.h1
                                    initial={{ opacity: 0, y: 18 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                                    className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter text-slate-900 max-w-4xl leading-[1.05] mb-5"
                                >
                                    Analyze any{" "}
                                    <span className="relative inline-block">
                                        <span className="bg-gradient-to-r from-blue-500 via-blue-500 to-blue-500 bg-clip-text text-transparent">
                                            codebase
                                        </span>
                                        <motion.span
                                            initial={{ scaleX: 0 }}
                                            animate={{ scaleX: 1 }}
                                            transition={{ delay: 0.7, duration: 0.5, ease: "easeOut" }}
                                            className="absolute -bottom-1 left-0 right-0 h-[3px] bg-blue-500 rounded-full origin-left"
                                        />
                                    </span>{" "}
                                    instantly.
                                </motion.h1>

                                {/* Subtitle */}
                                <motion.p
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2, duration: 0.55 }}
                                    className="text-lg md:text-xl text-slate-500 max-w-xl font-normal leading-relaxed mb-10"
                                >
                                    Paste a GitHub URL. Get architecture summaries, vulnerability
                                    reports, and refactoring maps in seconds not hours.
                                </motion.p>

                                {/* Search form */}
                                <motion.form
                                    onSubmit={handleAnalyze}
                                    initial={{ opacity: 0, y: 14 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.28, duration: 0.5 }}
                                    className="w-full max-w-2xl relative"
                                >
                                    <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl p-2 shadow-xl shadow-indigo-900/5 ring-4 ring-white/60 transition-all hover:ring-slate-100 hover:shadow-indigo-100/30">
                                        <div className="pl-4 pr-2 text-slate-400">
                                            <Search className="w-5 h-5" />
                                        </div>
                                        <Input
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            placeholder="https://github.com/owner/repository"
                                            className="flex-1 border-0 shadow-none focus-visible:ring-0 text-base md:text-lg h-13 px-2 bg-transparent text-slate-800 placeholder:text-slate-400 font-medium"
                                            aria-label="GitHub repository URL"
                                        />
                                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                            <Button
                                                type="submit"
                                                className="h-13 px-7 rounded-xl bg-black hover:bg-black/80 text-white text-base font-semibold flex items-center gap-2 transition-colors"
                                            >
                                                Scan Repo
                                                <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </motion.div>
                                    </div>

                                    <AnimatePresence>
                                        {error && (
                                            <motion.p
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="text-rose-500 text-sm font-medium mt-3 text-center"
                                            >
                                                {error}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </motion.form>

                                {/* Example repos */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="flex flex-wrap items-center justify-center gap-2 mt-5"
                                >
                                    <span className="text-xs text-slate-400 font-medium">Try:</span>
                                    {[
                                        "fastapi/fastapi",
                                        "vercel/next.js",
                                        "shadcn-ui/ui",
                                    ].map((repo) => (
                                        <button
                                            key={repo}
                                            type="button"
                                            onClick={() => setUrl(`https://github.com/${repo}`)}
                                            className="text-xs font-mono text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                                        >
                                            {repo}
                                        </button>
                                    ))}
                                </motion.div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── PROCESSING state ── */}
                <AnimatePresence>
                    {jobState === "processing" && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full max-w-2xl mt-10"
                        >
                            {/* Browser-chrome card, same visual as InteractiveDashboard */}
                            <div className="relative">
                                {/* Glow */}
                                <div className="absolute -inset-4 bg-gradient-to-b from-indigo-100/60 via-violet-50/40 to-transparent rounded-[2rem] blur-2xl pointer-events-none -z-10" />

                                <div className="w-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xl shadow-slate-300/30 bg-white">
                                    {/* Browser bar */}
                                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-100/80 border-b border-slate-200">
                                        <span className="w-3 h-3 rounded-full bg-rose-400" />
                                        <span className="w-3 h-3 rounded-full bg-amber-400" />
                                        <span className="w-3 h-3 rounded-full bg-emerald-400" />
                                        <div className="flex-1 mx-4">
                                            <div className="max-w-xs mx-auto bg-white border border-slate-200 rounded-md px-3 py-1 flex items-center gap-2">
                                                <motion.div
                                                    className="w-2 h-2 rounded-full bg-amber-400"
                                                    animate={{ opacity: [1, 0.3, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1.2 }}
                                                />
                                                <span className="text-[11px] text-slate-400 font-mono truncate">
                                                    {url.replace("https://", "")}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-10 flex flex-col items-center gap-8">
                                        {/* Progress bar at very top */}
                                        <div className="absolute top-[52px] left-0 right-0 h-1 overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ ease: "easeOut" }}
                                            />
                                        </div>

                                        {/* Spinner */}
                                        <div className="relative">
                                            <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
                                                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                                            </div>
                                            <motion.div
                                                className="absolute -inset-3 rounded-3xl border-2 border-indigo-200"
                                                animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.97, 1.03, 0.97] }}
                                                transition={{ repeat: Infinity, duration: 2 }}
                                            />
                                        </div>

                                        <div className="text-center">
                                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Extracting Insights</h3>
                                            <p className="text-slate-500 font-medium mt-2">{statusMessage}</p>
                                        </div>

                                        {/* Step tracker */}
                                        <StepTracker progress={progress} />

                                        {/* Slim progress bar */}
                                        <div className="w-full max-w-sm bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                                            <motion.div
                                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ ease: "easeOut" }}
                                            />
                                        </div>
                                        <p className="text-sm font-bold text-slate-400 tabular-nums">{progress}%</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── COMPLETED state ── */}
                <AnimatePresence>
                    {jobState === "complete" && result && (
                        <motion.div
                            key="complete"
                            initial={{ opacity: 0, y: 32 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full"
                        >
                            {/* ── Report header ── */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
                                <div>
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-sm font-semibold text-emerald-700 mb-3"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Analysis Complete
                                    </motion.div>
                                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900">Report</h2>
                                    <div className="flex items-center gap-2 mt-2 text-slate-400">
                                        <FileCode2 className="w-4 h-4 text-indigo-400" />
                                        <span className="text-sm font-mono font-medium">{url.replace("https://github.com/", "")}</span>
                                    </div>
                                </div>
                                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                                    <Button
                                        variant="outline"
                                        className="rounded-full px-6 h-11 font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 bg-white flex items-center gap-2"
                                        onClick={() => { setJobState("idle"); setUrl(""); setResult(null); }}
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Scan another repo
                                    </Button>
                                </motion.div>
                            </div>

                            {/* ── Dashboard-chrome wrapper (matches InteractiveDashboard) ── */}
                            <div className="relative">
                                {/* Glow */}
                                <div className="absolute -inset-4 bg-gradient-to-b from-indigo-100/60 via-violet-50/40 to-transparent rounded-[2rem] blur-2xl pointer-events-none -z-10" />

                                <div className="w-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xl shadow-slate-300/30 bg-white">
                                    {/* Browser chrome bar */}
                                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-100/80 border-b border-slate-200">
                                        <span className="w-3 h-3 rounded-full bg-rose-400" />
                                        <span className="w-3 h-3 rounded-full bg-amber-400" />
                                        <span className="w-3 h-3 rounded-full bg-emerald-400" />
                                        <div className="flex-1 mx-4">
                                            <div className="max-w-sm mx-auto bg-white border border-slate-200 rounded-md px-3 py-1 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                                <span className="text-[11px] text-slate-400 font-mono truncate">
                                                    codeanalyzer.ai/report/{url.replace("https://github.com/", "")}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Bento grid inside the chrome ── */}
                                    <div className="p-4 md:p-6 bg-slate-50/60">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

                                            {/* ── Health Score card ── */}
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.96 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.1 }}
                                                className="col-span-1 md:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 shadow-sm hover:shadow-md transition-shadow group"
                                            >
                                                <div className="w-full flex items-center justify-between mb-1">
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Overall Health</span>
                                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                                </div>
                                                <HealthRing score={result.health_score || "B+"} inView={true} />
                                                <p className="text-center text-xs text-slate-400 font-medium leading-relaxed">
                                                    Architectural solidity, bug severity &amp; best-practice adherence.
                                                </p>
                                            </motion.div>

                                            {/* ── Architecture card ── */}
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.96 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.17 }}
                                                className="col-span-1 md:col-span-8 bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 flex flex-col relative overflow-hidden shadow-xl hover:shadow-2xl transition-shadow"
                                            >
                                                <div className="absolute -top-20 -right-20 w-72 h-72 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none" />
                                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 blur-[60px] rounded-full pointer-events-none" />
                                                <div className="relative z-10 flex flex-col h-full">
                                                    <div className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-400 mb-4 tracking-widest uppercase">
                                                        <LayoutTemplate className="w-3.5 h-3.5" />
                                                        System Architecture
                                                    </div>
                                                    <p className="text-base md:text-lg text-slate-300 leading-relaxed font-light flex-1">
                                                        {result.architecture_summary || "Architecture map not found."}
                                                    </p>
                                                </div>
                                            </motion.div>

                                            {/* ── Bugs card ── */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 16 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.25 }}
                                                className="col-span-1 md:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex items-center gap-2 mb-5">
                                                    <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                                                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">Vulnerabilities &amp; Bugs</p>
                                                        <p className="text-[11px] text-slate-400">{result.bugs?.length || 0} issues found</p>
                                                    </div>
                                                </div>
                                                {result.bugs && result.bugs.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {result.bugs.map((bug: any, idx: number) => (
                                                            <motion.div
                                                                key={idx}
                                                                initial={{ opacity: 0, x: -8 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: 0.3 + idx * 0.06 }}
                                                                className="p-4 rounded-xl bg-rose-50/60 border border-rose-100 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-default"
                                                            >
                                                                <div className="flex items-start gap-2">
                                                                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                                                    <div>
                                                                        <h4 className="font-bold text-rose-900 text-sm">{bug.title}</h4>
                                                                        <p className="text-rose-700/80 mt-1 text-xs font-medium leading-relaxed">{bug.description}</p>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-10 text-center text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm">
                                                        ✓ No high-severity bugs discovered.
                                                    </div>
                                                )}
                                            </motion.div>

                                            {/* ── Improvements card ── */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 16 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.32 }}
                                                className="col-span-1 md:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex items-center gap-2 mb-5">
                                                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                                        <FlaskConical className="w-4 h-4 text-indigo-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">Refactoring Opportunities</p>
                                                        <p className="text-[11px] text-slate-400">{result.improvements?.length || 0} suggestions</p>
                                                    </div>
                                                </div>
                                                {result.improvements && result.improvements.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {result.improvements.map((imp: any, idx: number) => (
                                                            <motion.div
                                                                key={idx}
                                                                initial={{ opacity: 0, x: 8 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: 0.35 + idx * 0.06 }}
                                                                className="flex gap-3 p-4 rounded-xl bg-indigo-50/40 border border-indigo-50 hover:border-indigo-200 hover:bg-indigo-50/70 transition-colors cursor-default"
                                                            >
                                                                <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-indigo-400 ring-4 ring-indigo-100" />
                                                                <div>
                                                                    <h4 className="font-bold text-indigo-950 text-sm">{imp.title}</h4>
                                                                    <p className="text-indigo-900/70 mt-1 text-xs font-medium leading-relaxed">{imp.description}</p>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-10 text-center text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm">
                                                        ✓ Codebase is highly optimized.
                                                    </div>
                                                )}
                                            </motion.div>

                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {(jobState === "idle" || jobState === "error") && <CrossFeatureNav />}

            </main>

            <div className="w-full mt-auto">
                <Footer />
            </div>
        </div>
    );
}
