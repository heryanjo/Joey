import React, { useEffect, useState } from 'react';
import type { Outlet } from '../types/index.ts';
import { fetchOutlets } from '../utils/api.ts';

interface OutletLandingProps {
  onSelectOutlet: (code: string, route: 'vote' | 'leaderboard' | 'display') => void;
  onOpenAdmin: () => void;
}

export const OutletLanding: React.FC<OutletLandingProps> = ({
  onSelectOutlet,
  onOpenAdmin,
}) => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOutlets()
      .then((data) => setOutlets(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#211D1C] text-[#F7F0EA] flex flex-col justify-between selection:bg-[#F6AC67]/30">
      {/* Background cinematic glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[400px] bg-gradient-to-b from-[#D8B37A]/15 via-[#F6AC67]/5 to-transparent blur-3xl pointer-events-none" />

      {/* Main Container */}
      <main className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1 flex flex-col items-center text-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-10">
          <img
            src="/assets/aistudio/BO_LOGO_cc0ca4aa.png"
            alt="Black Owl Logo"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-[0_4px_25px_rgba(216,179,122,0.4)] mb-4 hover:scale-105 transition-transform"
          />
          <h1
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="tracking-[0.25em] text-2xl sm:text-4xl font-black text-[#F7F0EA] uppercase"
          >
            BLACK OWL
          </h1>
          <p className="tracking-[0.35em] text-xs sm:text-sm font-bold text-[#D8B37A] uppercase mt-1">
            HALLOWEEN BEST COSTUME VOTING NIGHT
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#342D2A] border border-[#4A3F39] text-xs text-[#AFA39B]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>6 Isolated Venue Outlets Live</span>
          </div>
        </div>

        {/* Introduction */}
        <div className="max-w-xl text-xs sm:text-sm text-[#AFA39B] mb-8 leading-relaxed">
          Select an outlet below to access the guest voting portal, public leaderboard, or 16:9 stage LED screen. In production venues, guests scan their table QR code directly into their respective venue.
        </div>

        {/* 6 Outlets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full text-left">
          {loading ? (
            <div className="col-span-full py-12 text-center text-[#AFA39B]">
              Loading venue outlets...
            </div>
          ) : (
            outlets.map((outlet) => (
              <div
                key={outlet.code}
                className="bg-[#342D2A] rounded-3xl border border-[#4A3F39]/60 hover:border-[#D8B37A]/50 p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-['Cinzel'] font-black text-xs text-[#D8B37A] tracking-wider">
                      {outlet.code}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        outlet.votingActive
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          : 'bg-rose-950 text-rose-300 border-rose-800'
                      }`}
                    >
                      {outlet.votingActive ? 'Voting Live' : 'Closed'}
                    </span>
                  </div>

                  <h3 className="font-['Cinzel'] font-bold text-lg text-[#F7F0EA] group-hover:text-[#F6AC67] transition-colors">
                    {outlet.name}
                  </h3>
                  <p className="text-xs text-[#AFA39B] mt-0.5">
                    {outlet.city}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-[#AFA39B] bg-[#211D1C] rounded-xl p-2 px-3 border border-[#4A3F39]/40">
                    <span>Event Votes:</span>
                    <span className="font-['Cinzel'] font-bold text-[#F6AC67]">
                      {outlet.totalVotes}
                    </span>
                  </div>
                </div>

                {/* Outlet Access Buttons */}
                <div className="mt-4 pt-3 border-t border-[#4A3F39]/50 flex flex-col gap-2">
                  <button
                    onClick={() => onSelectOutlet(outlet.code, 'vote')}
                    className="w-full py-2.5 rounded-xl bg-[#F6AC67] hover:bg-[#F29D4E] text-[#211D1C] font-extrabold text-xs tracking-wider uppercase transition-colors shadow flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Guest Vote Portal</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onSelectOutlet(outlet.code, 'leaderboard')}
                      className="py-1.5 px-2 rounded-lg bg-[#2A2422] hover:bg-[#3E3531] text-[#D8B37A] hover:text-[#F6AC67] text-[11px] font-semibold text-center border border-[#4A3F39] cursor-pointer"
                    >
                      Standings
                    </button>
                    <button
                      onClick={() => onSelectOutlet(outlet.code, 'display')}
                      className="py-1.5 px-2 rounded-lg bg-[#2A2422] hover:bg-[#3E3531] text-[#D8B37A] hover:text-[#F6AC67] text-[11px] font-semibold text-center border border-[#4A3F39] cursor-pointer"
                    >
                      16:9 LED View
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Admin Portal Shortcut */}
        <div className="mt-12 flex flex-col items-center">
          <button
            onClick={onOpenAdmin}
            className="py-2.5 px-5 rounded-2xl bg-[#2A2422] hover:bg-[#342D2A] border border-[#4A3F39] hover:border-[#D8B37A]/50 text-xs font-bold text-[#AFA39B] hover:text-[#D8B37A] tracking-wider uppercase shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-[#D8B37A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Staff Portal (Staff Login Required)</span>
          </button>
          <span className="text-[10px] text-[#AFA39B]/50 mt-1">
            Restricted to Black Owl venue managers and stage operators
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 text-center text-xs text-[#AFA39B] border-t border-[#342D2A] bg-[#211D1C]">
        BLACK OWL INDONESIA • HALLOWEEN BEST COSTUME NIGHT 2026
      </footer>
    </div>
  );
};
