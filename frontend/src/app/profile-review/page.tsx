import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function ProfileReviewPage() {
    return (
        <div className="min-h-screen bg-slate-50 relative flex flex-col items-center">
            <Navbar />
            <main className="flex-1 w-full max-w-4xl px-6 pt-40 pb-20 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-700 mb-6">
                    ✨ GitHub Profile Review
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-6">
                    Optimize your developer presence
                </h1>
                <p className="text-xl text-slate-500 max-w-2xl mb-12">
                    We scan your public repositories to grade your language proficiency, structural habits, and open-source impact. Get tactical feedback for your next tech interview.
                </p>

                <div className="w-full max-w-xl p-8 rounded-3xl bg-white border border-slate-200 shadow-xl flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 text-3xl">🚧</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Under Construction</h3>
                    <p className="text-slate-500 text-sm">We are currently mapping out our profile analysis engine. Check back soon for early access.</p>
                </div>
            </main>
            <div className="w-full mt-auto bg-white">
                <Footer />
            </div>
        </div>
    );
}
