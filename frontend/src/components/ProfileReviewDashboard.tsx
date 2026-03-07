'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, GitMerge, ExternalLink, Activity, Award,
  Sparkles, ChevronRight, Loader2, Clock, Zap,
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// ─── types ───────────────────────────────────────────────────────────────────
interface RadarMetrics {
  readability: number;
  architecture: number;
  testing: number;
  documentation: number;
  consistency: number;
  open_source: number;
}

interface AiSuggestion {
  priority: number;
  icon: string;
  title: string;
  detail: string;
  effort: string;
}

interface ReviewData {
  user_summary: string;
  inferred_skills: string[];
  achievements: { emoji: string; title: string }[];
  hireability_grade: string;
  hireability_reasoning: string;
  github_streak_estimate: string;
  total_contributions_estimate: string;
  code_quality_radar: RadarMetrics;
  ai_suggestions: string[];
}

interface DashboardProps {
  data: {
    username: string;
    avatar_url?: string;
    stats: {
      followers: number;
      public_repos: number;
      total_stars: number;
      top_language: string;
      language_breakdown: Record<string, number>;
    };
    review: ReviewData;
  };
}

// ─── grade ring ──────────────────────────────────────────────────────────────
const GRADE_MAP: Record<string, { stroke: string; pct: number; label: string }> = {
  'A+': { stroke: '#10b981', pct: 98, label: 'text-emerald-500' },
  'A':  { stroke: '#34d399', pct: 90, label: 'text-emerald-400' },
  'B+': { stroke: '#3b82f6', pct: 82, label: 'text-blue-500' },
  'B':  { stroke: '#60a5fa', pct: 75, label: 'text-blue-400' },
  'C':  { stroke: '#f59e0b', pct: 60, label: 'text-amber-500' },
  'D':  { stroke: '#f87171', pct: 40, label: 'text-rose-400' },
  'F':  { stroke: '#ef4444', pct: 20, label: 'text-red-500' },
};

function GradeRing({ grade }: { grade: string }) {
  const g = GRADE_MAP[grade] ?? { stroke: '#94a3b8', pct: 0, label: 'text-slate-400' };
  const dash = `${g.pct} 100`;
  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <path fill="none" stroke="#f1f5f9" strokeWidth="3"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        <motion.path fill="none" stroke={g.stroke} strokeWidth="3" strokeLinecap="round"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          initial={{ strokeDasharray: '0 100' }}
          animate={{ strokeDasharray: dash }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-black tracking-tighter leading-none ${g.label}`}>{grade}</span>
      </div>
    </div>
  );
}

// ─── language pie chart ───────────────────────────────────────────────────────
const PIE_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
];

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg">
      <span className="font-semibold">{name}</span>
      <span className="text-slate-400 ml-1.5">{value} repos</span>
    </div>
  );
};

function LanguagePie({ breakdown }: { breakdown: Record<string, number> }) {
  const entries = Object.entries(breakdown).slice(0, 10);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const data = entries.map(([name, value]) => ({ name, value }));

  if (data.length === 0) {
    return <p className="text-slate-400 text-sm">No language data available.</p>;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="w-40 h-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%"
              innerRadius={38} outerRadius={60}
              paddingAngle={2}
              dataKey="value"
              animationBegin={200}
              animationDuration={900}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip content={<CustomPieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-1.5 w-full min-w-0">
        {data.map(({ name, value }, i) => {
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <li key={name} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span className="text-xs text-slate-700 font-medium truncate flex-1">{name}</span>
              <span className="text-[11px] text-slate-400 font-mono tabular-nums">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── radar chart ─────────────────────────────────────────────────────────────
const RADAR_AXIS_LABELS: Record<string, string> = {
  readability:   'Readability',
  architecture:  'Architecture',
  testing:       'Testing',
  documentation: 'Docs',
  consistency:   'Consistency',
  open_source:   'Open Source',
};

const CustomRadarTick = ({ x, y, payload }: any) => (
  <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
    fill="#94a3b8" fontSize={11} fontWeight={600}>
    {payload.value}
  </text>
);

function RadarQuality({ metrics }: { metrics: RadarMetrics }) {
  const data = Object.entries(metrics).map(([key, val]) => ({
    subject: RADAR_AXIS_LABELS[key] ?? key,
    score: val,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
        <PolarGrid stroke="#1e293b" strokeDasharray="3 3" />
        <PolarAngleAxis dataKey="subject" tick={<CustomRadarTick />} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="Score" dataKey="score"
          stroke="#6366f1" strokeWidth={2}
          fill="#6366f1" fillOpacity={0.18}
          animationBegin={300} animationDuration={1000} animationEasing="ease-out"
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── AI suggestions panel ────────────────────────────────────────────────────
function AiSuggestionsPanel({ username }: { username: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchSuggestions = async () => {
    setState('loading');
    setErrorMsg('');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const apiKey  = process.env.NEXT_PUBLIC_API_KEY || '';
      const res = await fetch(`${baseUrl}/api/profile-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to fetch suggestions');
      }
      const json = await res.json();
      setSuggestions(json.suggestions ?? []);
      setState('done');
    } catch (e: any) {
      setErrorMsg(e.message);
      setState('error');
    }
  };

  const EFFORT_COLOR: Record<string, string> = {
    '15 min': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    '1 hr':   'bg-blue-50 text-blue-700 border-blue-200',
    '2–3 hrs':'bg-amber-50 text-amber-700 border-amber-200',
    '1 day':  'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            AI Profile Suggestions
          </CardTitle>
          {state !== 'done' && (
            <Button
              size="sm"
              onClick={fetchSuggestions}
              disabled={state === 'loading'}
              className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
            >
              {state === 'loading' ? (
                <><Loader2 className="w-3 h-3 animate-spin mr-1.5" />Generating…</>
              ) : (
                <><Zap className="w-3 h-3 mr-1.5" />Get Suggestions</>
              )}
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Targeted actions to improve your profile hireability.
        </p>
      </CardHeader>

      <AnimatePresence>
        {state === 'idle' && (
          <CardContent className="pt-0">
            <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center py-8 gap-2">
              <Sparkles className="w-8 h-8 text-slate-300" />
              <p className="text-sm text-slate-400 font-medium">Click "Get Suggestions" to generate</p>
            </div>
          </CardContent>
        )}

        {state === 'error' && (
          <CardContent className="pt-0">
            <p className="text-sm text-rose-500 font-medium">{errorMsg}</p>
          </CardContent>
        )}

        {state === 'done' && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <CardContent className="pt-0 space-y-3">
              {suggestions.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <span className="text-xl shrink-0 mt-0.5">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900">{s.title}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${EFFORT_COLOR[s.effort] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        <Clock className="w-2.5 h-2.5 inline mr-0.5" />{s.effort}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.detail}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                </motion.div>
              ))}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── stat pill ────────────────────────────────────────────────────────────────
function StatPill({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 bg-slate-50 rounded-2xl border border-slate-100 p-4">
      <div className="text-slate-400">{icon}</div>
      <span className="text-xl font-bold text-slate-800 tabular-nums">{value}</span>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ─── main dashboard ───────────────────────────────────────────────────────────
export default function ProfileReviewDashboard({ data }: DashboardProps) {
  const r = data.review;
  const stats = data.stats;

  const fade = {
    hidden: { opacity: 0, y: 16 },
    show:   { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 16 } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.09 } } }}
      className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-5 mt-6"
    >
      {/* ── Header ── */}
      <motion.div variants={fade} className="md:col-span-12">
        <Card className="border-slate-200 shadow-md overflow-hidden">
          <CardContent className="p-7 flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <img
              src={data.avatar_url ?? `https://github.com/${data.username}.png`}
              alt={data.username}
              className="w-24 h-24 rounded-2xl border-2 border-slate-100 shadow-sm object-cover shrink-0"
            />

            {/* Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  @{data.username}
                </h3>
                <a
                  href={`https://github.com/${data.username}`}
                  target="_blank" rel="noreferrer"
                  className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Summary — no buzzwords, factual */}
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mb-4">
                {r.user_summary}
              </p>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5">
                {r.inferred_skills?.map((skill, i) => (
                  <Badge key={i} variant="secondary" className="text-xs font-semibold bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Grade */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <GradeRing grade={r.hireability_grade ?? 'C'} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hireability</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Left column ── */}
      <div className="md:col-span-5 flex flex-col gap-5">

        {/* Stats row */}
        <motion.div variants={fade} className="grid grid-cols-3 gap-3">
          <StatPill icon={<Star className="w-4 h-4" />}     value={stats.total_stars}  label="Stars" />
          <StatPill icon={<GitMerge className="w-4 h-4" />} value={stats.public_repos} label="Repos" />
          <StatPill icon={<Activity className="w-4 h-4" />} value={stats.followers}    label="Followers" />
        </motion.div>

        {/* Language pie */}
        <motion.div variants={fade}>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900">Language Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <LanguagePie breakdown={stats.language_breakdown ?? {}} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity */}
        <motion.div variants={fade}>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {[
                { label: 'Consistency', value: r.github_streak_estimate },
                { label: 'Volume',      value: r.total_contributions_estimate },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl border border-slate-100 p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{label}</span>
                  <span className="text-sm font-semibold text-slate-800">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Achievements */}
        {r.achievements?.length > 0 && (
          <motion.div variants={fade}>
            <Card className="border-slate-200 bg-slate-900 shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Noteworthy Traits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {r.achievements.map((ach, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/8 border border-white/10 rounded-xl px-3 py-2.5">
                    <span className="text-xl w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg shrink-0">
                      {ach.emoji}
                    </span>
                    <span className="text-sm font-semibold text-slate-200">{ach.title}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* ── Right column ── */}
      <div className="md:col-span-7 flex flex-col gap-5">

        {/* Radar */}
        <motion.div variants={fade}>
          <Card className="border-slate-800 bg-slate-950 shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none rounded-xl" />
            <CardHeader className="pb-0 relative z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-white">Engineering Profile</CardTitle>
                <span className="text-[10px] font-mono text-slate-500">6-axis assessment</span>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <RadarQuality metrics={r.code_quality_radar} />
              {/* Score labels below chart */}
              <div className="grid grid-cols-3 gap-2 mt-1">
                {Object.entries(r.code_quality_radar).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between bg-white/5 rounded-lg px-2.5 py-1.5">
                    <span className="text-[10px] text-slate-400 capitalize">{RADAR_AXIS_LABELS[key] ?? key}</span>
                    <span className="text-[10px] font-bold text-indigo-400 tabular-nums">{val}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Hireability reasoning */}
        <motion.div variants={fade}>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900">Hireability Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <GradeRing grade={r.hireability_grade ?? 'C'} />
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl border border-slate-100 p-4 flex-1">
                  {r.hireability_reasoning}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Suggestions */}
        <motion.div variants={fade}>
          <AiSuggestionsPanel username={data.username} />
        </motion.div>
      </div>

      <Separator className="md:col-span-12 my-2" />
    </motion.div>
  );
}
