import React from 'react';
import type { Outlet } from '../types/index.ts';

interface HeaderProps {
  outlet: Outlet;
  activeTab: 'vote' | 'leaderboard';
  onTabChange: (tab: 'vote' | 'leaderboard') => void;
  votingActive: boolean;
  hasVoted?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  outlet,
  activeTab,
  onTabChange,
  votingActive,
  hasVoted,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#211D1C]/90 backdrop-blur-md border-b border-[#342D2A] px-4 pt-3 pb-2 transition-all">
      <div className="max-w-md mx-auto flex flex-col items-center text-center">
        {/* Brand Emblem */}
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <img
            src="/assets/aistudio/BO_LOGO_cc0ca4aa.png"
            alt="Black Owl"
            className="w-11 h-11 object-contain drop-shadow-[0_2px_8px_rgba(216,179,122,0.3)] transition-transform hover:scale-105"
          />
        </div>

        {/* Headings */}
        <div className="space-y-0.5">
          <h1 className="font-['Cinzel'] tracking-[0.22em] text-lg sm:text-xl font-bold text-[#F7F0EA] uppercase">
            BEST COSTUME
          </h1>
          <p className="tracking-[0.18em] text-[10px] sm:text-[11px] font-semibold text-[#D8B37A] uppercase">
            HALLOWEEN VOTING NIGHT
          </p>
        </div>

        {/* Outlet Venue Identifier & Live Status */}
        <div className="mt-2 mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#342D2A] border border-[#4A3F39] shadow-inner text-xs">
          <span className="font-semibold text-[#F7F0EA] tracking-wide">
            {outlet.name}
          </span>
          <span className="w-1 h-1 rounded-full bg-[#AFA39B]"></span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                votingActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span
              className={`text-[10px] uppercase font-bold tracking-wider ${
                votingActive ? 'text-emerald-300' : 'text-rose-400'
              }`}
            >
              {votingActive ? 'Voting Live' : 'Voting Closed'}
            </span>
          </span>
        </div>

        {/* Guest Voting status badge if voted */}
        {hasVoted && (
          <div className="mb-2.5 w-full bg-[#342D2A]/80 border border-[#D8B37A]/30 rounded-xl px-3 py-1.5 flex items-center justify-center gap-2 text-[11px] text-[#D8B37A]">
            <svg
              className="w-3.5 h-3.5 text-[#F6AC67]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium tracking-wide">
              Your official vote for tonight has been recorded.
            </span>
          </div>
        )}

        {/* Two minimalist navigation tabs */}
        <div
          role="tablist"
          aria-label="Voting Navigation"
          className="grid grid-cols-2 w-full p-1 bg-[#342D2A] rounded-2xl border border-[#4A3F39]/60 shadow-lg"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'vote'}
            onClick={() => onTabChange('vote')}
            className={`py-2 text-xs font-bold tracking-wider rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'vote'
                ? 'bg-[#F6AC67] text-[#211D1C] shadow-md font-extrabold'
                : 'text-[#AFA39B] hover:text-[#F7F0EA]'
            }`}
          >
            VOTE
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'leaderboard'}
            onClick={() => onTabChange('leaderboard')}
            className={`py-2 text-xs font-bold tracking-wider rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-[#F6AC67] text-[#211D1C] shadow-md font-extrabold'
                : 'text-[#AFA39B] hover:text-[#F7F0EA]'
            }`}
          >
            LEADERBOARD
          </button>
        </div>
      </div>
    </header>
  );
};
