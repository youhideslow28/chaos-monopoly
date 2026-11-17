import React, { useState } from 'react';
import { Globe2 } from 'lucide-react';
import { getCatalogEntry } from '../../worlds/catalog';
import { WORLD_UI, useLocale } from '../../worlds/i18n';
import { DEFAULT_WORLD_ID, WorldId } from '../../worlds/types';
import { WorldSelectionModal } from './WorldSelectionModal';

interface Props {
  worldId: string | undefined;
  onChange?: (id: WorldId) => void;
  /** When false the picker is read-only (e.g. non-host players in an online lobby). */
  canChange?: boolean;
}

export const WorldPicker: React.FC<Props> = ({ worldId, onChange, canChange = true }) => {
  const [open, setOpen] = useState(false);
  const [locale] = useLocale();
  const entry = getCatalogEntry(worldId ?? DEFAULT_WORLD_ID) ?? getCatalogEntry(DEFAULT_WORLD_ID)!;

  return (
    <>
      <div
        className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-700 bg-slate-900/80"
        data-testid="world-picker"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-9 h-9 rounded-lg shrink-0 border border-white/10"
            style={{ background: `linear-gradient(135deg, ${entry.palette.accent}, ${entry.palette.accent2})` }}
            aria-hidden
          />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">{WORLD_UI.world[locale]}</div>
            <div className="text-sm font-black text-white truncate" data-testid="world-picker-name">{entry.name[locale]}</div>
          </div>
        </div>
        {canChange && onChange ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            data-testid="world-picker-open"
            className="px-3 min-h-[40px] rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 shrink-0"
          >
            <Globe2 className="w-4 h-4" />
            {WORLD_UI.change[locale]}
          </button>
        ) : (
          <span className="text-[11px] text-slate-400 text-right">{WORLD_UI.hostOnly[locale]}</span>
        )}
      </div>
      {open && onChange && (
        <WorldSelectionModal selectedId={entry.id} onSelect={onChange} onClose={() => setOpen(false)} />
      )}
    </>
  );
};
