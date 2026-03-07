'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import RoastCard from '@/components/RoastCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CrossFeatureNav } from '@/components/CrossFeatureNav';

const LOADING_MESSAGES = [
    "Cloning your spaghetti code...",
    "Judging your variable names...",
    "Counting your abandoned side projects...",
    "Wondering why you still use `var`...",
    "Asking the AI to be ruthless...",
    "Brewing up some brutal honesty...",
];

type JobState = "idle" | "processing" | "complete" | "error";

export default function ProfileRoastPage() {
    const [username, setUsername] = useState('');
    const [jobState, setJobState] = useState<JobState>('idle');
    const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [roastData, setRoastData] = useState<any>(null);

    // Cycle loading messages
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (jobState === 'processing') {
            interval = setInterval(() => {
                setLoadingMessageIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [jobState]);

    const handleRoast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) return;

        setJobState('processing');
        setError(null);
        setRoastData(null);
        setLoadingMessageIdx(0);
        window.scrollTo({ top: 0, behavior: "smooth" });

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const apiKey  = process.env.NEXT_PUBLIC_API_KEY || '';

            const response = await fetch(`${baseUrl}/api/roast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
                },
                body: JSON.stringify({ username: username.trim() }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Failed to roast profile.');
            }

            const data = await response.json();
            setRoastData(data);
            setJobState('complete');
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Even the AI refused to look at your code.');
            setJobState('error');
        }
    };

    return (
        <div className="min-h-screen bg-grid-white text-slate-900 relative flex flex-col items-center overflow-x-hidden">
            <Navbar />

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
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-sm font-medium text-rose-600 mb-6">
                                🔥 Brutal GitHub Roast
                            </div>

                            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 relative text-slate-900">
                                Ready to be{" "}
                                <span className="relative inline-block">
                                    <span className="text-blue-500 px-2 py-1 rounded-md font-mono tracking-tight">
                                        destroyed?
                                    </span>
                                    {/* Underline decoration */}
                                    <motion.span
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ delay: 0.7, duration: 0.5, ease: "easeOut" }}
                                        className="absolute -bottom-1 left-0 right-0 h-[3px] bg-blue-500 rounded-full origin-left"
                                    />
                                </span>
                            </h1>

                            <p className="text-xl text-slate-500 max-w-2xl mb-12">
                                Enter your GitHub username and let our AI systematically destroy your ego based on your public repositories.
                            </p>

                            <motion.form
                                onSubmit={handleRoast}
                                className="w-full max-w-2xl relative"
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                            >
                                <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl p-2 shadow-xl shadow-indigo-900/5 ring-4 ring-white/60 transition-all hover:ring-slate-100 hover:shadow-indigo-100/30">
                                    <div className="pl-4 pr-2 text-slate-400">
                                        <Search className="w-5 h-5" />
                                    </div>
                                    <Input
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="tusharmihsra069"
                                        className="flex-1 border-0 shadow-none focus-visible:ring-0 text-base md:text-lg h-13 px-2 bg-transparent text-slate-800 placeholder:text-slate-400 font-medium"
                                        aria-label="GitHub Username"
                                    />
                                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                        <Button
                                            type="submit"
                                            disabled={!username.trim()}
                                            className="h-13 px-7 rounded-xl bg-black hover:bg-black/80 disabled:opacity-100 text-white text-base font-semibold flex items-center gap-2 transition-colors"
                                        >
                                            Roast Me
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
                            <div className="relative">
                                {/* Glow */}
                                <div className="absolute -inset-4 bg-gradient-to-b from-rose-100/60 via-orange-50/40 to-transparent rounded-[2rem] blur-2xl pointer-events-none -z-10" />

                                <div className="w-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xl shadow-slate-300/30 bg-white">
                                    {/* Browser chrome bar */}
                                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-100/80 border-b border-slate-200">
                                        <span className="w-3 h-3 rounded-full bg-rose-400" />
                                        <span className="w-3 h-3 rounded-full bg-amber-400" />
                                        <span className="w-3 h-3 rounded-full bg-emerald-400" />
                                        <div className="flex-1 mx-4">
                                            <div className="max-w-xs mx-auto bg-white border border-slate-200 rounded-md px-3 py-1 flex items-center justify-center gap-2">
                                                <motion.div
                                                    className="w-2 h-2 rounded-full bg-amber-400"
                                                    animate={{ opacity: [1, 0.3, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1.2 }}
                                                />
                                                <span className="text-[11px] text-slate-400 font-mono truncate">
                                                    github.com/{username}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-10 flex flex-col items-center gap-8">
                                        {/* Spinner */}
                                        <div className="relative mt-4">
                                            <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
                                                <div className="text-4xl animate-bounce">🔥</div>
                                            </div>
                                            <motion.div
                                                className="absolute -inset-3 rounded-3xl border-2 border-rose-200"
                                                animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.97, 1.03, 0.97] }}
                                                transition={{ repeat: Infinity, duration: 2 }}
                                            />
                                        </div>

                                        <div className="text-center mb-4">
                                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Gathering Evidence</h3>
                                            <p className="text-slate-500 font-medium mt-2">{LOADING_MESSAGES[loadingMessageIdx]}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── COMPLETED state ── */}
                <AnimatePresence>
                    {jobState === "complete" && roastData && (
                        <motion.div
                            key="complete"
                            initial={{ opacity: 0, y: 32 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full flex flex-col items-center"
                        >
                            {/* Action bar for Complete Phase */}
                            <div className="w-full max-w-lg flex flex-col sm:flex-row items-center justify-between mb-2 mt-4 gap-4">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 flex items-center gap-2">
                                        <span className="text-2xl">🔥</span> Roast Complete
                                    </h2>
                                </div>
                                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                                    <Button
                                        variant="outline"
                                        className="rounded-full px-5 h-10 font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 bg-white flex items-center gap-2 shadow-sm"
                                        onClick={() => { setJobState("idle"); setUsername(""); setRoastData(null); }}
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Roast another victim
                                    </Button>
                                </motion.div>
                            </div>

                            <RoastCard data={roastData} />
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
