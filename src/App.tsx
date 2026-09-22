import React, { useState, useEffect } from 'react';
import { GameId, PlayMode, SupportedLanguage, TikTokGift } from './types';
import { GameSelector } from './components/GameSelector';
import { ThreeLudo } from './components/ThreeLudo';
import { ThreeDomino } from './components/ThreeDomino';
import { ThreeTawla } from './components/ThreeTawla';
import { ThreeUno } from './components/ThreeUno';
import { TikTokLiveOverlay } from './components/TikTokLiveOverlay';
import { RulesModal } from './components/RulesModal';
import { sound } from './utils/sound';
import { translations } from './utils/translations';
import confetti from 'canvas-confetti';

export default function App() {
  const [activeGame, setActiveGame] = useState<GameId>('ludo');
  const [playMode, setPlayMode] = useState<PlayMode>('tiktok_live');
  const [lang, setLang] = useState<SupportedLanguage>('ar');
  const [is3DView, setIs3DView] = useState<boolean>(true);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [activeTeamBonus, setActiveTeamBonus] = useState<string | null>(null);

  // Sync RTL / LTR document direction when language changes
  useEffect(() => {
    const isRtl = lang === 'ar';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Handle Mute toggle
  const handleToggleMute = () => {
    sound.isMuted = !sound.isMuted;
    setIsMuted(sound.isMuted);
  };

  // Handle TikTok Gift Received
  const handleSendGift = (gift: TikTokGift) => {
    // Randomly assign bonus to current team/color
    const teams = ['red', 'green', 'yellow', 'blue'];
    const boostedTeam = teams[Math.floor(Math.random() * teams.length)];
    setActiveTeamBonus(boostedTeam);

    // Reset bonus after 10 seconds
    setTimeout(() => {
      setActiveTeamBonus(null);
    }, 10000);
  };

  // Get localized game title
  const activeGameTitle = translations[lang][
    activeGame === 'ludo'
      ? 'gameLudo'
      : activeGame === 'domino'
      ? 'gameDomino'
      : activeGame === 'tawla'
      ? 'gameTawla'
      : 'gameUno'
  ];

  return (
    <div className="w-full h-[100dvh] bg-slate-950 text-slate-100 flex items-center justify-center p-0 sm:p-2 overflow-hidden font-sans">
      {/* Background Ambience Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/30 rounded-full blur-[120px]" />
      </div>

      {/* Main Container: Supports TikTok 9:16 mobile frame on desktop and fluid mobile view */}
      <main
        className={`relative w-full h-full flex flex-col justify-between bg-slate-950 overflow-hidden shadow-2xl transition-all duration-300 ${
          isPhoneFrame
            ? 'max-w-[440px] sm:max-h-[920px] sm:rounded-[36px] sm:border-4 sm:border-slate-800'
            : 'max-w-4xl sm:rounded-2xl sm:border border-slate-800'
        }`}
      >
        {/* Top Game & Mode Selector */}
        <GameSelector
          activeGame={activeGame}
          onSelectGame={(g) => setActiveGame(g)}
          playMode={playMode}
          onChangePlayMode={(m) => setPlayMode(m)}
          is3DView={is3DView}
          onToggle3DView={() => setIs3DView(!is3DView)}
          lang={lang}
          onChangeLanguage={(l) => setLang(l)}
          onOpenRules={() => setIsRulesOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isPhoneFrame={isPhoneFrame}
          onTogglePhoneFrame={() => setIsPhoneFrame(!isPhoneFrame)}
        />

        {/* Live Gameplay Stage */}
        <div className="relative flex-1 w-full overflow-hidden flex flex-col items-center justify-center">
          {/* Active 3D Board Component */}
          {activeGame === 'ludo' && (
            <ThreeLudo
              lang={lang}
              playMode={playMode}
              is3DView={is3DView}
              activeTeamBonus={activeTeamBonus}
              onVictory={(w) => {
                confetti({ particleCount: 150 });
              }}
            />
          )}

          {activeGame === 'domino' && (
            <ThreeDomino
              lang={lang}
              playMode={playMode}
              is3DView={is3DView}
              activeTeamBonus={activeTeamBonus}
              onVictory={(w) => {
                confetti({ particleCount: 150 });
              }}
            />
          )}

          {activeGame === 'tawla' && (
            <ThreeTawla
              lang={lang}
              playMode={playMode}
              is3DView={is3DView}
              activeTeamBonus={activeTeamBonus}
              onVictory={(w) => {
                confetti({ particleCount: 150 });
              }}
            />
          )}

          {activeGame === 'uno' && (
            <ThreeUno
              lang={lang}
              playMode={playMode}
              is3DView={is3DView}
              activeTeamBonus={activeTeamBonus}
              onVictory={(w) => {
                confetti({ particleCount: 150 });
              }}
            />
          )}

          {/* TikTok Live Stream HUD and Interactive Overlay */}
          {playMode === 'tiktok_live' && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-30">
              <TikTokLiveOverlay
                lang={lang}
                onSendGift={handleSendGift}
                activeGameName={activeGameTitle}
                isStreamerMode={true}
              />
            </div>
          )}
        </div>

        {/* Rules and Instructions Modal */}
        <RulesModal
          isOpen={isRulesOpen}
          onClose={() => setIsRulesOpen(false)}
          activeGame={activeGame}
          lang={lang}
        />
      </main>
    </div>
  );
}
