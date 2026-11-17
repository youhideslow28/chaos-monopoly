import React, { useEffect, useState } from 'react';
import { Check, Lock, X, Sparkles } from 'lucide-react';
import { WORLD_CATALOG } from '../../worlds/catalog';
import { WORLD_UI, useLocale } from '../../worlds/i18n';
import { useWorldConfig } from '../../worlds/runtime';
import { getWorldEvents } from '../../worlds/worldEvents';
import { WorldCatalogEntry, WorldId } from '../../worlds/types';

interface Props {
  selectedId: string;
  onSelect: (id: WorldId) => void;
  onClose: () => void;
}

const artFor = (w: WorldCatalogEntry) =>
  `radial-gradient(120px 80px at 30% 20%, ${w.palette.accent}55, transparent 70%), radial-gradient(140px 90px at 80% 90%, ${w.palette.accent2}44, transparent 70%), linear-gradient(160deg, ${w.palette.bgAlt}, ${w.palette.bg})`;

export const WorldSelectionModal: React.FC<Props> = ({ selectedId, onSelect, onClose }) => {
  const [locale, setLocale] = useLocale();
  const [previewId, setPreviewId] = useState<WorldId>(
    (WORLD_CATALOG.find(w => w.id === selectedId)?.id ?? WORLD_CATALOG[0].id) as WorldId
  );
  const preview = WORLD_CATALOG.find(w => w.id === previewId)!;
  const runtime = useWorldConfig(preview.availability === 'AVAILABLE' ? preview.id : undefined);
  const events = getWorldEvents(preview.id);
  const sample = runtime.config ? Object.values(runtime.config.pack.tileNames).slice(0, 6) : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const playable = preview.availability === 'AVAILABLE';
  const chosen = preview.id === selectedId;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-stretch sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={WORLD_UI.title[locale]}
      data-testid="world-selection-modal"
    >
      <div className="w-full max-w-5xl max-h-full overflow-y-auto sm:rounded-3xl bg-[#0b1220] border border-slate-700 shadow-2xl p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              {WORLD_UI.title[locale]}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">{WORLD_UI.subtitle[locale]}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex rounded-lg overflow-hidden border border-slate-700" role="group" aria-label={WORLD_UI.language[locale]}>
              {(['vi', 'en'] as const).map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocale(l)}
                  data-testid={`world-locale-${l}`}
                  aria-pressed={locale === l}
                  className={`px-2.5 py-1 text-xs font-bold min-h-[32px] ${locale === l ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-300'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={WORLD_UI.close[locale]}
              data-testid="world-selection-close"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 min-h-[36px] min-w-[36px]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2.5">
            {WORLD_CATALOG.map(w => {
              const isPreview = w.id === previewId;
              const ok = w.availability === 'AVAILABLE';
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setPreviewId(w.id)}
                  data-testid={`world-card-${w.id}`}
                  aria-pressed={isPreview}
                  className={`relative text-left rounded-2xl border overflow-hidden transition-all min-h-[112px] ${
                    isPreview ? 'border-cyan-400 ring-2 ring-cyan-400/40' : 'border-slate-700 hover:border-slate-500'
                  } ${ok ? '' : 'opacity-70'}`}
                  style={{ background: artFor(w) }}
                >
                  <div className="p-2.5 flex flex-col gap-1 h-full justify-end">
                    <span
                      className={`self-start px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                        ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-900/80 text-slate-300'
                      }`}
                    >
                      {!ok && <Lock className="w-3 h-3" />}
                      {ok ? WORLD_UI.available[locale] : WORLD_UI.comingSoon[locale]}
                    </span>
                    <span className="text-sm font-black text-white leading-tight">{w.name[locale]}</span>
                    {w.id === selectedId && (
                      <span className="absolute top-2 right-2 bg-cyan-500 text-slate-950 rounded-full p-0.5">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-slate-700 p-4 flex flex-col gap-3" style={{ background: artFor(preview) }} data-testid="world-preview">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-300">{WORLD_UI.preview[locale]}</div>
              <h3 className="text-lg font-black text-white">{preview.name[locale]}</h3>
              <p className="text-xs font-semibold" style={{ color: preview.palette.accent }}>{preview.tagline[locale]}</p>
            </div>
            <p className="text-sm text-slate-200">{preview.description[locale]}</p>
            <div className="flex flex-wrap gap-1.5">
              {preview.styleTags.map((t, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-black/40 text-[11px] text-slate-200 border border-white/10">{t[locale]}</span>
              ))}
              <span className="px-2 py-0.5 rounded-full bg-black/40 text-[11px] text-slate-200 border border-white/10">
                {WORLD_UI.completeness[locale]}: {preview.completeness === 'FULL' ? WORLD_UI.full[locale] : WORLD_UI.configOnly[locale]}
              </span>
            </div>
            <div className="flex gap-1">
              {Object.values(preview.palette).slice(0, 7).map((c, i) => (
                <span key={i} className="w-6 h-6 rounded-md border border-white/20" style={{ background: c }} aria-hidden />
              ))}
            </div>

            {playable && runtime.loading && <div className="text-xs text-slate-300">{WORLD_UI.loading[locale]}</div>}
            {playable && runtime.fallbackUsed && <div className="text-xs text-amber-300">{WORLD_UI.fallback[locale]}</div>}

            {playable && runtime.config && (
              <>
                {runtime.config.pack.features.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-300 uppercase">{WORLD_UI.features[locale]}</div>
                    <ul className="text-xs text-slate-200 list-disc ml-4">
                      {runtime.config.pack.features.map((f, i) => <li key={i}>{f[locale]}</li>)}
                    </ul>
                  </div>
                )}
                {sample.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-300 uppercase">{WORLD_UI.sampleTiles[locale]}</div>
                    <div className="text-xs text-slate-200">{sample.map(s => s[locale]).join(' • ')}</div>
                  </div>
                )}
                {events.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-300 uppercase">{WORLD_UI.events[locale]}</div>
                    <ul className="text-xs text-slate-200 space-y-0.5">
                      {events.map(e => <li key={e.id}>• <strong>{e.name[locale]}</strong></li>)}
                    </ul>
                    <p className="text-[11px] text-slate-400 mt-1">{WORLD_UI.rulesNote[locale]}</p>
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              disabled={!playable}
              onClick={() => {
                if (playable) {
                  onSelect(preview.id);
                  onClose();
                }
              }}
              data-testid="world-select-btn"
              className={`mt-auto min-h-[44px] rounded-xl font-black text-sm ${
                playable ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {!playable ? WORLD_UI.notPlayable[locale] : chosen ? WORLD_UI.selected[locale] : WORLD_UI.select[locale]}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
