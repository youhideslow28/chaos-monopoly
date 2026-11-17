import React from 'react';
import { Target, Gift, Check } from 'lucide-react';
import { claimQuest, useDailyQuests } from '../../game/quests/dailyQuests';
import { soundEffects } from '../../game/sound/soundEngine';
import { useLocale, COSMETIC_UI } from '../../worlds/i18n';

/** Compact "today's quests" card shown on the main menu. */
export const DailyQuestsPanel: React.FC = () => {
  const { quests, progress, claimed } = useDailyQuests();
  const [locale] = useLocale();

  return (
    <div
      data-testid="daily-quests"
      className="w-full rounded-2xl bg-white border border-[#e5e0d3] p-3 space-y-2 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-emerald-700" />
        <span className="t-label text-[11px] text-slate-600">
          {COSMETIC_UI.dailyQuestsTitle[locale]}
        </span>
      </div>

      <ul className="space-y-1.5">
        {quests.map((quest) => {
          const done = (progress[quest.id] || 0) >= quest.target;
          const isClaimed = claimed.includes(quest.id);
          return (
            <li key={quest.id} className="flex items-center gap-2 text-xs">
              <span className="flex-1 t-body text-slate-700 truncate">
                {quest.text[locale]}
                <span className="text-slate-400">
                  {' '}
                  ({Math.min(progress[quest.id] || 0, quest.target)}/{quest.target})
                </span>
              </span>
              {isClaimed ? (
                <span className="t-label text-[10px] text-emerald-700 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {COSMETIC_UI.questsClaimed[locale]}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={!done}
                  onClick={() => {
                    soundEffects.buyProperty();
                    claimQuest(quest.id);
                  }}
                  className={`t-label text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 border transition ${
                    done
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                  }`}
                >
                  <Gift className="w-3 h-3" />
                  {quest.coins}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
