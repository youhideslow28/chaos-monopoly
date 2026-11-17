import React from 'react';
import { useModalDismiss } from '../common/useModalDismiss';
import {
  toggleMuteAudio,
  updateAudioSettings,
  useAudioSettings,
} from '../../cosmetics/audioSettings';
import { soundEffects } from '../../game/sound/soundEngine';
import { GAME_UI, getLocale, setLocale, COSMETIC_UI } from '../../worlds/i18n';
import { isShakeEnabled, setShakeEnabled } from '../../game/fx/screenShake';
import {
  Settings,
  X,
  Volume2,
  VolumeX,
  Eye,
  Sliders,
  Globe2,
  Check,
  Waves,
} from 'lucide-react';

type AISpeed = 'NORMAL' | 'FAST' | 'TURBO';

const AI_SPEED_IDS: AISpeed[] = ['NORMAL', 'FAST', 'TURBO'];
const AI_SPEED_LABEL_KEYS: Record<AISpeed, keyof typeof GAME_UI> = {
  NORMAL: 'aiSpeedSlow',
  FAST: 'aiSpeedNormal',
  TURBO: 'aiSpeedFast',
};

interface SettingsModalProps {
  onClose: () => void;
  is3DView?: boolean;
  onToggle3D?: () => void;
  aiSpeed?: AISpeed;
  onChangeAISpeed?: (speed: AISpeed) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  is3DView,
  onToggle3D,
  aiSpeed,
  onChangeAISpeed,
}) => {
  const audio = useAudioSettings();
  const locale = getLocale();
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);

  const { backdropProps } = useModalDismiss({
    isOpen: true,
    onClose,
  });

  const handleTestSound = () => {
    soundEffects.click();
    setTimeout(() => soundEffects.buyProperty(), 120);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      {...backdropProps}
      data-testid="settings-modal"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl bg-[#fdfbf7] border border-[#e8e2d5] shadow-2xl p-5 sm:p-6 flex flex-col gap-4 relative z-10 my-auto max-h-[92vh] overflow-y-auto text-slate-900"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e8e2d5]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white font-black shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black font-serif text-slate-900">
                {COSMETIC_UI.settings[locale]}
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {COSMETIC_UI.settingsAudioVisual[locale]}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              soundEffects.click();
              onClose();
            }}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-[#e8e2d5] transition-all shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Language Toggle */}
        <div className="p-4 rounded-2xl bg-white border border-[#e8e2d5] shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Globe2 className="w-4 h-4 text-amber-600" />
              <span>{COSMETIC_UI.language[locale]}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundEffects.click();
                setLocale('vi');
              }}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                locale === 'vi'
                  ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                  : 'bg-[#faf8f5] text-slate-700 border-[#e8e2d5] hover:bg-slate-50'
              }`}
            >
              <span>{COSMETIC_UI.langVietnamese[locale]}</span>
              {locale === 'vi' && <Check className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                soundEffects.click();
                setLocale('en');
              }}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                locale === 'en'
                  ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                  : 'bg-[#faf8f5] text-slate-700 border-[#e8e2d5] hover:bg-slate-50'
              }`}
            >
              <span>English</span>
              {locale === 'en' && <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 2. Audio Settings (4 Independent Channels) */}
        <div className="p-4 rounded-2xl bg-white border border-[#e8e2d5] shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Volume2 className="w-4 h-4 text-amber-600" />
              <span>{COSMETIC_UI.audioSettings[locale]}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                toggleMuteAudio();
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                audio.isMuted
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {audio.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{audio.isMuted ? COSMETIC_UI.mute[locale] : COSMETIC_UI.unmute[locale]}</span>
            </button>
          </div>

          {/* Master Volume */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-600 font-bold">
              <span>{COSMETIC_UI.masterVolume[locale]}</span>
              <span className="text-amber-700 font-extrabold">{Math.round(audio.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              disabled={audio.isMuted}
              value={audio.masterVolume}
              onChange={e => updateAudioSettings({ masterVolume: parseFloat(e.target.value) })}
              className="w-full accent-amber-600 cursor-pointer disabled:opacity-50"
            />
          </div>

          {/* Music Volume */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-600 font-bold">
              <span>{COSMETIC_UI.musicVolume[locale]}</span>
              <span className="text-amber-700 font-extrabold">{Math.round(audio.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              disabled={audio.isMuted}
              value={audio.musicVolume}
              onChange={e => updateAudioSettings({ musicVolume: parseFloat(e.target.value) })}
              className="w-full accent-amber-600 cursor-pointer disabled:opacity-50"
            />
          </div>

          {/* SFX Volume */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-600 font-bold">
              <span>{COSMETIC_UI.sfxVolume[locale]}</span>
              <span className="text-amber-700 font-extrabold">{Math.round(audio.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              disabled={audio.isMuted}
              value={audio.sfxVolume}
              onChange={e => updateAudioSettings({ sfxVolume: parseFloat(e.target.value) })}
              className="w-full accent-amber-600 cursor-pointer disabled:opacity-50"
            />
          </div>

          {/* Ambience Volume */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-600 font-bold">
              <span className="flex items-center gap-1">
                <Waves className="w-3.5 h-3.5 text-amber-600" />
                <span>{COSMETIC_UI.settingsAmbience[locale]}</span>
              </span>
              <span className="text-amber-700 font-extrabold">{Math.round((audio.ambienceVolume ?? 0.6) * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              disabled={audio.isMuted}
              value={audio.ambienceVolume ?? 0.6}
              onChange={e => updateAudioSettings({ ambienceVolume: parseFloat(e.target.value) })}
              className="w-full accent-amber-600 cursor-pointer disabled:opacity-50"
            />
          </div>

          <button
            type="button"
            onClick={handleTestSound}
            className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200/80 flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-700" />
            <span>{COSMETIC_UI.settingsSoundTest[locale]}</span>
          </button>
        </div>

        {/* 3. Match Options */}
        {onChangeAISpeed && aiSpeed && (
          <div className="p-4 rounded-2xl bg-white border border-[#e8e2d5] shadow-sm space-y-2">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-amber-600" />
              <span>{COSMETIC_UI.settingsAiSpeed[locale]}</span>
            </span>
            <div className="grid grid-cols-3 gap-2">
              {AI_SPEED_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    soundEffects.click();
                    onChangeAISpeed(id);
                  }}
                  aria-pressed={aiSpeed === id}
                  className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                    aiSpeed === id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-[#faf8f5] text-slate-700 border-[#e8e2d5] hover:bg-slate-50'
                  }`}
                >
                  {GAME_UI[AI_SPEED_LABEL_KEYS[id]][locale]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Visual & Camera Options */}
        {onToggle3D && (
          <div className="p-4 rounded-2xl bg-white border border-[#e8e2d5] shadow-sm space-y-2">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Eye className="w-4 h-4 text-amber-600" />
              <span>{COSMETIC_UI.visualSettings[locale]}</span>
            </span>

            <button
              type="button"
              onClick={() => {
                soundEffects.click();
                onToggle3D();
              }}
              className="w-full py-2.5 px-3.5 rounded-xl bg-[#faf8f5] hover:bg-slate-100 border border-[#e8e2d5] text-xs font-bold text-slate-800 flex items-center justify-between transition-all"
            >
              <span>{is3DView ? COSMETIC_UI.view3d[locale] : COSMETIC_UI.view2d[locale]}</span>
              <span className="text-amber-700 text-[11px] font-black underline">{GAME_UI.switchWord[locale]}</span>
            </button>

            <button
              type="button"
              data-testid="toggle-screen-shake"
              onClick={() => {
                soundEffects.click();
                const next = !isShakeEnabled();
                setShakeEnabled(next);
                forceRender();
              }}
              aria-pressed={isShakeEnabled()}
              className="w-full py-2.5 px-3.5 rounded-xl bg-[#faf8f5] hover:bg-slate-100 border border-[#e8e2d5] text-xs font-bold text-slate-800 flex items-center justify-between transition-all"
            >
              <span>{GAME_UI.screenShake[locale]}</span>
              <span className="text-amber-700 text-[11px] font-black underline">
                {isShakeEnabled() ? GAME_UI.screenShakeOn[locale] : GAME_UI.screenShakeOff[locale]}
              </span>
            </button>
          </div>
        )}

        {/* Footer Build Info */}
        <div className="text-center text-[11px] text-slate-500 pt-2 border-t border-[#e8e2d5] space-y-0.5">
          <p className="font-bold text-slate-700">
            CHAOS MONOPOLY • Warm Premium Edition
          </p>
          <p>{COSMETIC_UI.settingsBuildInfo[locale]}</p>
        </div>
      </div>
    </div>
  );
};
