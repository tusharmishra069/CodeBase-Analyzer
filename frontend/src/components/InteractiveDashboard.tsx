"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView, useMotionValue, useSpring } from "framer-motion";
import {
    LayoutDashboard, GitBranch, ShieldCheck, Zap, Bell, Search,
    TrendingUp, TrendingDown, Bug, FileCode2, Activity,
    ChevronRight, MoreHorizontal, Circle, CheckCircle2,
    AlertTriangle, Code2, Settings, User, Database,
    Command
} from "lucide-react";

// ─── Animated counter hook ───────────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1800, inView = false) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (!inView) return;
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setValue(target); clearInterval(timer); }
            else setValue(Math.floor(start));
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration, inView]);
    return value;
}

// ─── Mini SVG Sparkline ───────────────────────────────────────────────────────
function Sparkline({ data, color, inView }: { data: number[]; color: string; inView: boolean }) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const w = 80, h = 32;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / (max - min || 1)) * h;
        return `${x},${y}`;
    }).join(" ");
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
            <motion.polyline
                points={pts}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={inView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
            />
        </svg>
    );
}

// ─── Animated bar chart ───────────────────────────────────────────────────────
function BarChart({ data, inView }: { data: { label: string; value: number; color: string }[]; inView: boolean }) {
    const max = Math.max(...data.map(d => d.value));
    return (
        <div className="flex items-end gap-1.5 h-24 w-full mt-2">
            {data.map((bar, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-1 group">
                    <div className="relative w-full flex items-end justify-center" style={{ height: "80px" }}>
                        <motion.div
                            className="w-full rounded-t-md cursor-pointer transition-opacity"
                            style={{ backgroundColor: bar.color }}
                            initial={{ height: 0, opacity: 0.6 }}
                            animate={inView ? { height: `${(bar.value / max) * 80}px`, opacity: 1 } : { height: 0 }}
                            transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                            whileHover={{ opacity: 0.85, scaleX: 1.05 }}
                        />
                        {/* tooltip */}
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-semibold bg-slate-800 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                            {bar.value}
                        </span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-medium">{bar.label}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ segments, inView }: { segments: { value: number; color: string; label: string }[]; inView: boolean }) {
    const total = segments.reduce((s, d) => s + d.value, 0);
    const r = 28, cx = 36, cy = 36, stroke = 10;
    const circumference = 2 * Math.PI * r;
    let cumulative = 0;
    return (
        <div className="flex items-center gap-4">
            <svg width={72} height={72} viewBox="0 0 72 72" className="shrink-0">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
                {segments.map((seg, i) => {
                    const fraction = seg.value / total;
                    const dasharray = fraction * circumference;
                    const offset = circumference - cumulative * circumference;
                    cumulative += fraction;
                    return (
                        <motion.circle
                            key={i}
                            cx={cx} cy={cy} r={r}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth={stroke}
                            strokeLinecap="round"
                            strokeDasharray={`${dasharray} ${circumference}`}
                            strokeDashoffset={offset}
                            style={{ transform: "rotate(-90deg)", transformOrigin: "36px 36px" }}
                            initial={{ strokeDasharray: `0 ${circumference}` }}
                            animate={inView ? { strokeDasharray: `${dasharray} ${circumference}` } : { strokeDasharray: `0 ${circumference}` }}
                            transition={{ duration: 1, delay: i * 0.2, ease: "easeOut" }}
                        />
                    );
                })}
                <text x={cx} y={cy + 5} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">
                    {total}
                </text>
            </svg>
            <div className="flex flex-col gap-1.5">
                {segments.map((seg, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                        <span className="text-[10px] text-slate-500 font-medium">{seg.label}</span>
                        <span className="text-[10px] font-bold text-slate-700 ml-auto">{seg.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Notification Dot ─────────────────────────────────────────────────────────
function NotifDot() {
    return (
        <motion.span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ duration: 0.4, delay: 1.5 }}
        />
    );
}

// ─── Activity feed item ───────────────────────────────────────────────────────
const activityData = [
    { icon: <GitBranch className="w-3 h-3" />, color: "bg-violet-100 text-violet-600", text: "PR #42 merged into main", time: "2m ago", status: "success" },
    { icon: <Bug className="w-3 h-3" />, color: "bg-rose-100 text-rose-600", text: "Critical bug in auth.ts detected", time: "8m ago", status: "error" },
    { icon: <ShieldCheck className="w-3 h-3" />, color: "bg-emerald-100 text-emerald-600", text: "Security scan passed — 0 issues", time: "14m ago", status: "success" },
    { icon: <Zap className="w-3 h-3" />, color: "bg-amber-100 text-amber-600", text: "Performance score improved +12", time: "31m ago", status: "info" },
    { icon: <FileCode2 className="w-3 h-3" />, color: "bg-sky-100 text-sky-600", text: "6 files analyzed in repo-v2", time: "1h ago", status: "info" },
];

// ─── Notification popup items ─────────────────────────────────────────────────
const notifications = [
    { title: "New scan ready", body: "fastapi/full-stack-template completed", time: "just now" },
    { title: "Score improved", body: "Health grade upgraded A → A+", time: "5m ago" },
    { title: "Bug resolved", body: "SQL injection risk patched", time: "12m ago" },
];

// ─── KPI cards data ───────────────────────────────────────────────────────────
const kpiData = [
    { label: "Repos Analyzed", value: 1284, suffix: "", change: "+18%", up: true, sparkline: [30, 45, 38, 60, 55, 72, 80, 78, 92, 100], color: "#6366f1" },
    { label: "Health Score", value: 94, suffix: "%", change: "+4%", up: true, sparkline: [70, 72, 75, 73, 80, 82, 85, 88, 90, 94], color: "#10b981" },
    { label: "Bugs Found", value: 342, suffix: "", change: "-11%", up: false, sparkline: [100, 95, 88, 80, 70, 65, 55, 50, 45, 342 / 3.4], color: "#f43f5e" },
    { label: "Avg Scan Time", value: 12, suffix: "s", change: "-23%", up: true, sparkline: [40, 35, 30, 28, 22, 20, 18, 15, 13, 12], color: "#f59e0b" },
];

const barData = [
    { label: "Mon", value: 24, color: "#818cf8" },
    { label: "Tue", value: 37, color: "#818cf8" },
    { label: "Wed", value: 28, color: "#6366f1" },
    { label: "Thu", value: 52, color: "#6366f1" },
    { label: "Fri", value: 44, color: "#818cf8" },
    { label: "Sat", value: 18, color: "#c7d2fe" },
    { label: "Sun", value: 9, color: "#c7d2fe" },
];

const donutData = [
    { value: 58, color: "#6366f1", label: "Completed" },
    { value: 24, color: "#10b981", label: "In Progress" },
    { value: 18, color: "#f43f5e", label: "Failed" },
];

const navItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: "Overview", active: true },
    { icon: <Activity className="w-4 h-4" />, label: "Analytics" },
    { icon: <GitBranch className="w-4 h-4" />, label: "Repositories" },
    { icon: <ShieldCheck className="w-4 h-4" />, label: "Security" },
    { icon: <Database className="w-4 h-4" />, label: "Data" },
    { icon: <Settings className="w-4 h-4" />, label: "Settings" },
];

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function InteractiveDashboard() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });
    const [showNotifs, setShowNotifs] = useState(false);
    const [activeNav, setActiveNav] = useState(0);
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);
    const [newNotif, setNewNotif] = useState(false);

    // Simulate a new notification appearing after 3s
    useEffect(() => {
        const t = setTimeout(() => setNewNotif(true), 3000);
        return () => clearTimeout(t);
    }, []);

    const kpi0 = useAnimatedCounter(kpiData[0].value, 1600, inView);
    const kpi1 = useAnimatedCounter(kpiData[1].value, 1400, inView);
    const kpi2 = useAnimatedCounter(kpiData[2].value, 1800, inView);
    const kpi3 = useAnimatedCounter(kpiData[3].value, 1200, inView);
    const counters = [kpi0, kpi1, kpi2, kpi3];

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full"
        >
            {/* Glow behind dashboard */}
            <div className="absolute -inset-4 bg-gradient-to-b from-indigo-100/60 via-violet-50/40 to-transparent rounded-[2rem] blur-2xl pointer-events-none -z-10" />

            {/* Browser chrome */}
            <div className="w-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xl shadow-slate-300/30 bg-white">
                {/* Browser top bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-100/80 border-b border-slate-200">
                    <span className="w-3 h-3 rounded-full bg-rose-400" />
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400" />
                    <div className="flex-1 mx-4">
                        <div className="max-w-xs mx-auto bg-white border border-slate-200 rounded-md px-3 py-1 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-[11px] text-slate-400 font-mono">app.codeanalyzer.ai/dashboard</span>
                        </div>
                    </div>
                </div>

                {/* Dashboard body */}
                <div className="flex h-[420px] md:h-[480px] overflow-hidden bg-slate-50/60">

                    {/* ── Sidebar ── */}
                    <motion.aside
                        initial={{ x: -20, opacity: 0 }}
                        animate={inView ? { x: 0, opacity: 1 } : {}}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="hidden md:flex flex-col w-[52px] hover:w-44 transition-all duration-300 ease-in-out bg-white border-r border-slate-200 overflow-hidden shrink-0 group/sidebar"
                    >
                        {/* Logo */}
                        <div className="flex items-center gap-2 px-3 py-4 border-b border-slate-100">
                            <div className="w-7 h-7  flex items-center justify-center shrink-0">
                                <Command className="w-4 h-4 text-black" />
                            </div>
                            <span className="text-sm font-bold text-slate-900 whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                                CodeAnalyzer
                            </span>
                        </div>

                        {/* Nav */}
                        <nav className="flex-1 py-3 flex flex-col gap-0.5 px-1.5">
                            {navItems.map((item, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveNav(i)}
                                    className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-all w-full whitespace-nowrap group/item ${activeNav === i
                                        ? "bg-indigo-50 text-indigo-700"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                >
                                    <span className="shrink-0">{item.icon}</span>
                                    <span className="text-xs font-medium opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                                        {item.label}
                                    </span>
                                    {activeNav === i && (
                                        <motion.span
                                            layoutId="activeIndicator"
                                            className="ml-auto w-1 h-1 rounded-full bg-indigo-500 opacity-0 group-hover/sidebar:opacity-100 shrink-0"
                                        />
                                    )}
                                </button>
                            ))}
                        </nav>

                        {/* User avatar */}
                        <div className="flex items-center gap-2 px-2.5 py-3 border-t border-slate-100">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 min-w-0">
                                <p className="text-[11px] font-semibold text-slate-800 whitespace-nowrap">Tushar M.</p>
                                <p className="text-[10px] text-slate-400 whitespace-nowrap">Pro Plan</p>
                            </div>
                        </div>
                    </motion.aside>

                    {/* ── Main content ── */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 flex flex-col gap-3 min-w-0">

                        {/* Top bar */}
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: 0.3, duration: 0.4 }}
                            className="flex items-center justify-between gap-2 shrink-0"
                        >
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">Overview</h2>
                                <p className="text-[11px] text-slate-400 font-medium">March 7, 2026</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Search */}
                                <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-400 w-32">
                                    <Search className="w-3 h-3 shrink-0" />
                                    <span>Search...</span>
                                </div>
                                {/* Bell */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowNotifs(v => !v)}
                                        className="relative p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all"
                                        aria-label="Notifications"
                                    >
                                        <Bell className="w-4 h-4" />
                                        <AnimatePresence>
                                            {newNotif && <NotifDot />}
                                        </AnimatePresence>
                                    </button>
                                    {/* Dropdown */}
                                    <AnimatePresence>
                                        {showNotifs && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                                                transition={{ duration: 0.18 }}
                                                className="absolute right-0 top-9 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
                                            >
                                                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                                                    <span className="text-[11px] font-bold text-slate-800">Notifications</span>
                                                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full">{notifications.length}</span>
                                                </div>
                                                {notifications.map((n, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, x: 8 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.07 }}
                                                        className="px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                                                    >
                                                        <p className="text-[11px] font-semibold text-slate-800">{n.title}</p>
                                                        <p className="text-[10px] text-slate-400">{n.body}</p>
                                                        <p className="text-[10px] text-indigo-400 mt-0.5">{n.time}</p>
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                {/* Avatar */}
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center shrink-0 cursor-pointer">
                                    <User className="w-3.5 h-3.5 text-white" />
                                </div>
                            </div>
                        </motion.div>

                        {/* ── KPI cards ── */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
                            {kpiData.map((kpi, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={inView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ delay: 0.35 + i * 0.07, duration: 0.45 }}
                                    onHoverStart={() => setHoveredCard(i)}
                                    onHoverEnd={() => setHoveredCard(null)}
                                    className="bg-white border border-slate-200 rounded-xl p-3 cursor-pointer group relative overflow-hidden transition-shadow hover:shadow-md"
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`${kpi.label}: ${counters[i]}${kpi.suffix}`}
                                >
                                    {/* Hover glow */}
                                    <motion.div
                                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ background: `radial-gradient(circle at 50% 0%, ${kpi.color}15, transparent 70%)` }}
                                    />
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{kpi.label}</p>
                                        <div className="flex items-end justify-between gap-1">
                                            <span className="text-xl font-black text-slate-900 tabular-nums leading-none">
                                                {counters[i]}{kpi.suffix}
                                            </span>
                                            <Sparkline data={kpi.sparkline} color={kpi.color} inView={inView} />
                                        </div>
                                        <div className={`flex items-center gap-0.5 mt-1.5 text-[10px] font-bold ${kpi.up ? "text-emerald-600" : "text-rose-500"}`}>
                                            {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            <span>{kpi.change} this week</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* ── Lower grid ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 flex-1 min-h-0">

                            {/* Bar chart */}
                            <motion.div
                                initial={{ opacity: 0, x: -12 }}
                                animate={inView ? { opacity: 1, x: 0 } : {}}
                                transition={{ delay: 0.6, duration: 0.5 }}
                                className="sm:col-span-7 bg-white border border-slate-200 rounded-xl p-3"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-800">Scans This Week</p>
                                        <p className="text-[10px] text-slate-400">Daily repository analyses</p>
                                    </div>
                                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">+28% vs last week</span>
                                </div>
                                <BarChart data={barData} inView={inView} />
                            </motion.div>

                            {/* Donut */}
                            <motion.div
                                initial={{ opacity: 0, x: 12 }}
                                animate={inView ? { opacity: 1, x: 0 } : {}}
                                transition={{ delay: 0.65, duration: 0.5 }}
                                className="sm:col-span-5 bg-white border border-slate-200 rounded-xl p-3 flex flex-col"
                            >
                                <p className="text-[11px] font-bold text-slate-800 mb-2">Job Breakdown</p>
                                <div className="flex-1 flex items-center">
                                    <DonutChart segments={donutData} inView={inView} />
                                </div>
                            </motion.div>

                            {/* Activity feed */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={inView ? { opacity: 1, y: 0 } : {}}
                                transition={{ delay: 0.7, duration: 0.5 }}
                                className="sm:col-span-12 bg-white border border-slate-200 rounded-xl p-3"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[11px] font-bold text-slate-800">Recent Activity</p>
                                    <button className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-0.5 transition-colors">
                                        View all <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-0.5">
                                    {activityData.map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={inView ? { opacity: 1, scale: 1 } : {}}
                                            transition={{ delay: 0.75 + i * 0.06 }}
                                            className="flex items-center gap-2 shrink-0 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2 cursor-pointer hover:bg-slate-100 hover:border-slate-200 transition-all group/activity"
                                        >
                                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${item.color} shrink-0`}>
                                                {item.icon}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-semibold text-slate-700 whitespace-nowrap">{item.text}</p>
                                                <p className="text-[9px] text-slate-400">{item.time}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>

                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
