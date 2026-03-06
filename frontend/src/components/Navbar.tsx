"use client";

import { motion } from "framer-motion";
import { Command, Github } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
    return (
        <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200"
        >
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 text-slate-900 font-bold text-xl tracking-tight">
                    <Command className="w-6 h-6" />
                    <span>CodeAnalyzer</span>
                </Link>

                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                    <Link href="/#features" className="hover:text-slate-900 transition-colors">Features</Link>
                    <Link href="/#pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
                </nav>

                <div className="flex items-center gap-4">
                    <a href="https://github.com/tusharmishra069/CodeBase-Analyzer" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-900 transition-colors">
                        <Github className="w-5 h-5" />
                    </a>
                    <Link href="/repo-analysis">
                        <Button className="rounded-full px-6 font-semibold bg-slate-900 text-white hover:bg-slate-800">
                            Get Started
                        </Button>
                    </Link>
                </div>
            </div>
        </motion.header>
    );
}
