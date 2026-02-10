import { useAuth } from '../contexts/AuthContext';
import {
    ChevronDown,
    ArrowUp,
    ArrowUpRight,
    TrendingUp,
    Target,
    Zap,
    Search
} from 'lucide-react';

export const AnalyticsDashboard = () => {
    const { user } = useAuth();
    const analytics = user?.analytics;

    if (!analytics || !analytics.resumeScore) {
        return (
            <div className="bg-[#f8f9fb] rounded-[32px] p-12 text-center border border-gray-200 mt-8 shadow-sm">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
                    <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">System Ready</h3>
                <p className="text-gray-500 text-sm">Upload your profile to calculate performance metrics.</p>
            </div>
        );
    }

    const score = analytics.resumeScore;
    const prevScore = analytics.scoreHistory && analytics.scoreHistory.length >= 2
        ? analytics.scoreHistory[analytics.scoreHistory.length - 2].score
        : 0;
    const improvement = score - prevScore;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 font-sans">

            {/* Performance Card */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[420px]">
                <h3 className="text-xl font-semibold text-gray-800 mb-8">Performance</h3>

                <div className="flex justify-between items-start mb-12">
                    <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-4xl font-bold text-gray-800">{improvement}%</span>
                            <ArrowUp className="w-5 h-5 text-green-500 stroke-[3]" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Last Month</span>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5 mb-1.5">
                            <span className="text-4xl font-bold text-gray-800">16%</span>
                            <ArrowUp className="w-5 h-5 text-green-500 stroke-[3]" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Last Quarter</span>
                    </div>
                </div>

                <div className="divide-y divide-gray-100">
                    <div className="py-4 flex items-center justify-between hover:bg-gray-50 px-4 rounded-lg cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                            <TrendingUp size={18} className="text-gray-600" />
                            <span className="text-[15px] font-semibold text-gray-800">Long Term Positions</span>
                        </div>
                        <ChevronDown size={20} className="text-gray-400" />
                    </div>
                    <div className="py-4 flex items-center justify-between hover:bg-gray-50 px-4 rounded-lg cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="text-xs font-bold border border-gray-600 px-1.5 py-0.5 rounded-sm">IP</div>
                            <span className="text-[15px] font-semibold text-gray-800">High Profit IPOs</span>
                        </div>
                        <ChevronDown size={20} className="text-gray-400" />
                    </div>
                </div>
            </div>

            {/* Health Card */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[420px] items-center">
                <div className="flex justify-between items-center w-full mb-8">
                    <h3 className="text-xl font-semibold text-gray-800">Health</h3>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
                        Explore Insights <ArrowUpRight size={14} />
                    </div>
                </div>

                <div className="relative w-64 h-32 flex items-center justify-center">
                    <svg className="w-full h-auto" viewBox="0 0 200 115">
                        <defs>
                            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#f97316" />
                                <stop offset="50%" stopColor="#84cc16" />
                                <stop offset="100%" stopColor="#16a34a" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="20"
                        />
                        <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke="url(#gaugeGradient)"
                            strokeWidth="20"
                            strokeDasharray="251.2"
                            strokeDashoffset={251.2 - (251.2 * (score / 100))}
                            className="transition-all duration-700 ease-in-out"
                        />
                    </svg>
                    <div className="absolute bottom-0 text-center">
                        <span className="text-4xl font-bold text-gray-800">{score}%</span>
                        <p className="text-[11px] font-bold uppercase text-gray-400 mt-2">
                            {score >= 80 ? 'Optimal' : score >= 60 ? 'Healthy' : 'Needs Review'}
                        </p>
                    </div>
                </div>

                <div className="flex justify-between w-64 text-[10px] font-bold text-gray-400 mt-3">
                    <span>0%</span>
                    <span>100%</span>
                </div>
            </div>

            {/* Analysis Card */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[420px]">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-gray-800">Analysis</h3>
                        <div className="bg-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">12</div>
                    </div>
                    <div className="text-xs font-bold text-gray-400 flex gap-3">
                        <span className="hover:text-gray-600 cursor-pointer">Buy</span>
                        <span>·</span>
                        <span className="hover:text-gray-600 cursor-pointer">Sell</span>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="cursor-pointer">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[16px] font-semibold text-green-600">+12.40 pts</span>
                            <span className="text-[11px] font-bold text-gray-400">Today, 4:23 PM</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center">
                                    <Target className="w-5 h-5 text-gray-600" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-800">MATCH</div>
                                    <div className="text-xs text-gray-500 font-semibold">Product Design</div>
                                </div>
                            </div>
                            <div className="text-sm font-bold text-gray-800">92% Prob.</div>
                        </div>
                    </div>

                    <div className="cursor-pointer">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[16px] font-semibold text-red-500">-8.20 pts</span>
                            <span className="text-[11px] font-bold text-gray-400">Yesterday, 5:54 PM</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-800">MISS</div>
                                    <div className="text-xs text-gray-500 font-semibold">Cloud Infra.</div>
                                </div>
                            </div>
                            <div className="text-sm font-bold text-gray-800">-5 Units</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
