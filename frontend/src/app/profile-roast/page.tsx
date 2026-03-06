import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function ProfileRoastPage() {
    return (
        <div className="min-h-screen bg-slate-900 text-white relative flex flex-col items-center">
            <Navbar />
            <main className="flex-1 w-full max-w-4xl px-6 pt-40 pb-20 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-sm font-medium text-rose-400 mb-6">
                    🔥 Brutal GitHub Roast
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 relative">
                    Ready to be destroyed?
                    <div className="absolute -inset-x-10 -inset-y-10 bg-rose-500/20 blur-[100px] -z-10 rounded-full" />
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mb-12">
                    This AI will relentlessly mock your lack of tests, abandoned side projects, and 500-day unmerged PRs. Enter your username at your own risk.
                </p>

                <div className="w-full max-w-xl p-8 rounded-3xl bg-slate-800 border border-slate-700 shadow-2xl flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center mb-4 text-3xl">🚧</div>
                    <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
                    <p className="text-slate-400 text-sm">We are currently training our LLM on how to be as sarcastic and mean as possible. Check back later.</p>
                </div>
            </main>
            <div className="w-full mt-auto">
                <Footer />
            </div>
        </div>
    );
}
