import React from 'react';
import { GameId, PlayMode, SupportedLanguage } from '../types';
import { translations } from '../utils/translations';
import { sound } from '../utils/sound';
import { Volume2, VolumeX, Eye, BookOpen, Smartphone, Globe } from 'lucide-react';

interface GameSelectorProps {
  activeGame: GameId;
  onSelectGame: (game: GameId) => void;
  playMode: PlayMode;
  onChangePlayMode: (mode: PlayMode) => void;
  is3DView: boolean;
  onToggle3DView: () => void;
  lang: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  onOpenRules: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isPhoneFrame: boolean;
  onTogglePhoneFrame: () => void;
}

export const GameSelector: React.FC<GameSelectorProps> = ({
  activeGame,
  onSelectGame,
  playMode,
  onChangePlayMode,
  is3DView,
  onToggle3DView,
  lang,
  onChangeLanguage,
  onOpenRules,
  isMuted,
  onToggleMute,
  isPhoneFrame,
  onTogglePhoneFrame,
}) => {
  const t = translations[lang];

  const games: { id: GameId; label: string; icon: string; bg: string }[] = [
    { id: 'ludo', label: t.gameLudo, icon: '🎲', bg: 'from-rose-600 to-amber-600' },
    { id: 'domino', label: t.gameDomino, icon: '🀄', bg: 'from-emerald-600 to-teal-700' },
    { id: 'tawla', label: t.gameTawla, icon: '🪵', bg: 'from-amber-700 to-amber-900' },
    { id: 'uno', label: t.gameUno, icon: '🃏', bg: 'from-sky-600 to-indigo-700' },
  ];

  const modes: { id: PlayMode; label: string }[] = [
    { id: 'tiktok_live', label: t.tiktokLiveMode },
    { id: 'pass_play', label: t.passAndPlay },
    { id: 'vs_ai', label: t.vsAi },
  ];

  const languages: { code: SupportedLanguage; label: string }[] = [
    { code: 'ar', label: 'العربية' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'de', label: 'Deutsch' },
  ];

  return (
    <div className="w-full flex flex-col gap-2 p-2 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 shadow-xl z-40">
      {/* Top Utilities Row: Language Selector, Sound, 3D Toggle, TikTok Frame, Rules */}
      <div className="w-full flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        {/* Languages Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-700/80">
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <select
            value={lang}
            onChange={(e) => onChangeLanguage(e.target.value as SupportedLanguage)}
            className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
            id="select-language"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Toggles */}
        <div className="flex items-center gap-1.5">
          {/* 3D / 2D Perspective Toggle */}
          <button
            onClick={onToggle3DView}
            id="btn-toggle-3d"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              is3DView
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md ring-1 ring-amber-300'
                : 'bg-slate-900 text-slate-300 border border-slate-700'
            }`}
            title={t.cameraView}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{is3DView ? t.camera3D : t.camera2D}</span>
          </button>

          {/* TikTok 9:16 Phone Frame Toggle */}
          <button
            onClick={onTogglePhoneFrame}
            id="btn-toggle-phone-frame"
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              isPhoneFrame
                ? 'bg-rose-600 border-rose-400 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title="تنسيق شاشة تيك توك 9:16"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* Sound Mute */}
          <button
            onClick={onToggleMute}
            id="btn-toggle-sound"
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-950/60 border-rose-600 text-rose-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title={isMuted ? t.soundOn : t.soundOff}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Rules Modal */}
          <button
            onClick={onOpenRules}
            id="btn-open-rules"
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-all cursor-pointer"
            title={t.rules}
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Games Selector Tabs */}
      <div className="grid grid-cols-4 gap-1.5">
        {games.map((game) => {
          const isActive = activeGame === game.id;
          return (
            <button
              key={game.id}
              id={`tab-game-${game.id}`}
              onClick={() => {
                sound.playTileClick();
                onSelectGame(game.id);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-2xl font-black text-xs transition-all duration-300 cursor-pointer ${
                isActive
                  ? `bg-gradient-to-r ${game.bg} text-white shadow-lg ring-2 ring-white/40 scale-102`
                  : 'bg-slate-900/90 text-slate-400 hover:bg-slate-850 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span className="text-base">{game.icon}</span>
              <span className="truncate">{game.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Play Modes Selector (TikTok Live vs Pass & Play vs AI) */}
      <div className="flex items-center justify-center gap-1.5 bg-slate-900/60 p-1 rounded-2xl border border-slate-800">
        {modes.map((mode) => {
          const isSelected = playMode === mode.id;
          return (
            <button
              key={mode.id}
              id={`tab-mode-${mode.id}`}
              onClick={() => {
                sound.playTileClick();
                onChangePlayMode(mode.id);
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center truncate ${
                isSelected
                  ? 'bg-slate-800 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
