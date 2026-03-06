"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";
import { InteractiveDashboard } from "@/components/InteractiveDashboard";
import { ThreeDScene } from "@/components/ThreeDScene";
import { Button } from "@/components/ui/button";

// ─── Trusted-by logos (text-based, no images) ────────────────────────────────
const trustedBy = ["Vercel", "Linear", "Stripe", "Supabase", "Railway", "PlanetScale"];

export default function Home() {
  return (
    <div className="min-h-screen bg-grid-white relative overflow-x-hidden">
      <Navbar />

      {/* ── Ambient background blobs ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
       <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-indigo-100/40 blur-[120px]" />
        <div className="absolute top-[40%] -right-60 w-[500px] h-[500px] rounded-full bg-violet-100/30 blur-[100px]" />
        <div className="absolute top-[60%] -left-60 w-[400px] h-[400px] rounded-full bg-sky-100/30 blur-[100px]" />
      </div>

      <main className="flex flex-col items-center w-full">

        {/* ════════════════════════════════════════════════
            HERO SECTION
        ════════════════════════════════════════════════ */}
        <section
          className="w-full flex flex-col items-center text-center pt-32 pb-16 px-6 relative"
          aria-label="Hero section"
        >
          {/* 3D floating shape background */}
          {/* <ThreeDScene /> */}

          {/* Grid-to-transparent fade mask */}
          {/* <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-white/60 via-white/40 to-transparent pointer-events-none z-0" /> */}

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-sm font-medium text-slate-600 mb-8"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>3 powerful AI analysis modules</span>
            <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold">
              New <ArrowRight className="w-3 h-3" />
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-black tracking-tighter text-slate-900 max-w-5xl leading-[1.05] mb-5"
          >
            Review any codebase{" "}
            <br className="hidden sm:block" />
            in{" "}
            <span className="relative inline-block">
              <span className="text-blue-500 px-2 py-1 rounded-md font-mono tracking-tight">
                seconds
              </span>
              {/* Underline decoration */}
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.7, duration: 0.5, ease: "easeOut" }}
                className="absolute -bottom-1 left-0 right-0 h-[3px] bg-blue-500 rounded-full origin-left"
              />
            </span>
            {", not hours."}
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.6 }}
            className="text-lg md:text-xl text-slate-500 max-w-2xl font-normal leading-relaxed mb-10"
          >
            Paste a GitHub URL. Our AI clones, parses, and reviews your entire
            architecture  surfacing bugs, security risks, and refactoring
            opportunities with surgical precision.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.55 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14"
          >
            {/* Primary */}
            <Link href="/repo-analysis" aria-label="Get started with CodeAnalyzer">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Button
                  className="h-13 px-8 rounded-full bg-slate-900 text-white hover:bg-black text-base font-semibold flex items-center gap-2 shadow-xl shadow-slate-900/15 transition-colors"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </Link>

            {/* Secondary */}
            {/* <Link href="/#features" aria-label="Book a demo">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Button
                  variant="outline"
                  className="h-13 px-8 rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-base font-semibold flex items-center gap-2 shadow-sm transition-all"
                >
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  Book Demo
                </Button>
              </motion.div>
            </Link> */}
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col items-center gap-3 mb-16"
          >
            <div className="flex -space-x-2">
              {["from-violet-400 to-indigo-500", "from-sky-400 to-cyan-500", "from-emerald-400 to-teal-500", "from-rose-400 to-pink-500", "from-amber-400 to-orange-500"].map((g, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${g} border-2 border-white ring-1 ring-white/50`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span>Trusted by <strong className="text-slate-800">2,400+</strong> developers</span>
            </div>
          </motion.div>

          {/* ── Interactive Dashboard Demo ── */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-6xl"
          >
            <InteractiveDashboard />
          </motion.div>

          {/* Trusted by bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-16 flex flex-col items-center gap-4"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Loved by engineers at
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {trustedBy.map((name, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85 + i * 0.05 }}
                  className="text-slate-300 font-extrabold text-lg tracking-tight hover:text-slate-500 transition-colors cursor-default select-none"
                >
                  {name}
                </motion.span>
              ))}
            </div>
          </motion.div>

        </section>

        {/* ════════════════════════════════════════════════
            FEATURES / PRICING / FOOTER
        ════════════════════════════════════════════════ */}
        <div className="relative z-10 bg-white w-full">
          {/* <Features /> */}
          {/* <Pricing /> */}
          <Footer />
        </div>

      </main>
    </div>
  );
}
