import React from 'react';
import type { Contestant } from '../types/index.ts';

interface VoteSuccessModalProps {
  contestant: Contestant | null;
  onViewLeaderboard: () => void;
  onClose: () => void;
}

export const VoteSuccessModal: React.FC<VoteSuccessModalProps> = ({
  contestant,
  onViewLeaderboard,
  onClose,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vote-success-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
    >
      <div className="w-full max-w-sm bg-[#342D2A] border border-[#D8B37A]/50 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Subtle gold gradient radial background */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#D8B37A]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#F6AC67]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Animated Gold Checkmark */}
        <div className="w-16 h-16 rounded-full bg-[#211D1C] border-2 border-[#D8B37A] flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(216,179,122,0.35)] animate-bounce-short">
          <svg
            className="w-8 h-8 text-[#F6AC67]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h3 id="vote-success-title" className="font-['Cinzel'] text-xl font-extrabold text-[#F7F0EA] tracking-wider uppercase mb-1">
          YOUR VOTE IS IN!
        </h3>
        <p className="text-xs font-semibold text-[#D8B37A] tracking-widest uppercase mb-4">
          OFFICIAL BALLOT RECORDED
        </p>

        {contestant && (
          <div className="w-full bg-[#211D1C] rounded-2xl border border-[#4A3F39]/60 p-3.5 mb-5 flex items-center gap-3 text-left">
            <img
              src={contestant.imageUrl}
              alt={contestant.name}
              className="w-14 h-18 rounded-xl object-cover bg-[#27211F]"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-[#D8B37A] tracking-wider uppercase block">
                {contestant.numberDisplay}
              </span>
              <h4 className="font-semibold text-sm text-[#F7F0EA] truncate">
                {contestant.name}
              </h4>
              <p className="text-xs text-[#F6AC67] truncate font-medium mt-0.5">
                {contestant.instagram || (contestant.costume?.startsWith('@') ? contestant.costume : `@${contestant.costume}`)}
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-[#AFA39B] leading-relaxed mb-6">
          Thank you for celebrating Halloween with Black Owl. You can now follow the live leaderboard as rankings change throughout the night!
        </p>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={onViewLeaderboard}
            className="w-full py-3 rounded-2xl bg-[#F6AC67] hover:bg-[#F29D4E] text-[#211D1C] font-extrabold text-xs tracking-widest uppercase transition-all duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>VIEW LIVE LEADERBOARD</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-transparent hover:bg-[#2A2422] text-[#AFA39B] hover:text-[#F7F0EA] text-xs font-semibold tracking-wider transition-colors cursor-pointer"
          >
            BACK TO CONTESTANTS
          </button>
        </div>
      </div>
    </div>
  );
};
