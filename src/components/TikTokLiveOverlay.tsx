import React, { useState, useEffect, useRef } from 'react';
import { LiveComment, TikTokGift, SupportedLanguage } from '../types';
import { sound } from '../utils/sound';
import { translations } from '../utils/translations';
import confetti from 'canvas-confetti';
import { Heart, Send, Sparkles, MessageCircle, Flame, Users, Gift, Crown, Share2, Swords, Zap } from 'lucide-react';

interface TikTokLiveOverlayProps {
  lang: SupportedLanguage;
  onSendGift: (gift: TikTokGift) => void;
  activeGameName: string;
  isStreamerMode: boolean;
}

const TIKTOK_GIFTS: TikTokGift[] = [
  { id: 'rose', nameKey: 'giftRose', coins: 1, icon: '🌹', color: 'text-rose-400', effect: 'cheer' },
  { id: 'donut', nameKey: 'giftDonut', coins: 30, icon: '🍩', color: 'text-amber-400', effect: 'boost' },
  { id: 'crown', nameKey: 'giftCrown', coins: 199, icon: '👑', color: 'text-yellow-400', effect: 'crown' },
  { id: 'galaxy', nameKey: 'giftGalaxy', coins: 500, icon: '🚀', color: 'text-purple-400', effect: 'galaxy' },
  { id: 'lion', nameKey: 'giftLion', coins: 1000, icon: '🦁', color: 'text-amber-500', effect: 'lion' },
];

const INITIAL_COMMENTS: LiveComment[] = [
  { id: '1', username: 'Karim_Live', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=faces', text: 'ولع البث يا أسطورة! حظك نار 🔥', time: 'الآن' },
  { id: '2', username: 'Nour_Gamer', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&crop=faces', text: 'العب الأحمر هتكسب على طول 🎲', time: 'الآن' },
  { id: '3', username: 'Zaid_Cairo', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=60&h=60&fit=crop&crop=faces', text: 'دومينو على الصفر يا كبير 🀄', time: 'منذ ثوان' },
];

const RANDOM_NAMES = ['Ahmad_King', 'Sara_99', 'Omar_Streamer', 'Layla_DZ', 'Hamza_Pro', 'Rana_Game', 'Sami_KSA'];
const RANDOM_COMMENTS = [
  'ارمي النرد بسرعة يا فنان 🎲',
  'أونوووووووو 🔔',
  'طاولة الزهر دوش ستات 🪵',
  'أقوى بث مباشر عالتيك توك اليوم 🌟',
  'كفووو عليك يا وحش 👏',
  'الجمهور معاك وفي ضهرك ❤️',
  'هديتك وصلت يا كينج 🎁',
  'الأسد في الطريق يا بطل 🦁🔥',
];

export const TikTokLiveOverlay: React.FC<TikTokLiveOverlayProps> = ({
  lang,
  onSendGift,
  activeGameName,
}) => {
  const t = translations[lang];

  const [viewerCount, setViewerCount] = useState<number>(24580);
  const [likesCount, setLikesCount] = useState<number>(76340);
  const [comments, setComments] = useState<LiveComment[]>(INITIAL_COMMENTS);
  const [inputComment, setInputComment] = useState<string>('');
  const [activeBanner, setActiveBanner] = useState<{ icon: string; title: string; sender: string } | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [likeStreak, setLikeStreak] = useState<number>(0);
  const [pkScore, setPkScore] = useState<{ streamer: number; opponent: number }>({ streamer: 12450, opponent: 10890 });
  const [showGiftTray, setShowGiftTray] = useState<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const streakTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fluctuating viewers & random automated chat stream
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount((prev) => prev + Math.floor(Math.random() * 31) - 15);

      if (Math.random() > 0.4) {
        const randName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
        const randText = RANDOM_COMMENTS[Math.floor(Math.random() * RANDOM_COMMENTS.length)];
        const newCom: LiveComment = {
          id: String(Date.now()),
          username: randName,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${randName}`,
          text: randText,
          time: 'الآن',
        };
        setComments((prev) => [...prev.slice(-8), newCom]);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Auto scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [comments]);

  // Handle tap anywhere on stream to send likes with combo streak
  const handleTapLikes = (e: React.MouseEvent) => {
    const heartColors = ['#f43f5e', '#ec4899', '#f59e0b', '#3b82f6', '#10b981'];
    const randomColor = heartColors[Math.floor(Math.random() * heartColors.length)];

    setLikesCount((prev) => prev + 1);
    setPkScore((prev) => ({ ...prev, streamer: prev.streamer + 15 }));

    const newStreak = likeStreak + 1;
    setLikeStreak(newStreak);
    sound.playComboDing(Math.min(newStreak, 10));

    if (streakTimerRef.current) clearTimeout(streakTimerRef.current);
    streakTimerRef.current = setTimeout(() => {
      setLikeStreak(0);
    }, 1200);

    const heartId = Date.now() + Math.random();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setFloatingHearts((prev) => [...prev.slice(-15), { id: heartId, x, y, color: randomColor }]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 1200);
  };

  // Trigger TikTok Gift with animation & full-screen celebration
  const triggerSendGift = (gift: TikTokGift) => {
    sound.playGiftSound(gift.effect);
    onSendGift(gift);

    // Boost streamer PK score
    setPkScore((prev) => ({ ...prev, streamer: prev.streamer + gift.coins * 50 }));

    if (gift.id === 'lion') {
      confetti({ particleCount: 250, spread: 120, origin: { y: 0.6 } });
    } else if (gift.id === 'galaxy' || gift.id === 'crown') {
      confetti({ particleCount: 150, spread: 90 });
    }

    setActiveBanner({
      icon: gift.icon,
      title: `أرسل ${t[gift.nameKey as keyof typeof t]}!`,
      sender: 'أنت (الداعم الأول)',
    });

    setTimeout(() => {
      setActiveBanner(null);
    }, 3500);
  };

  // Send typed comment
  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputComment.trim()) return;

    sound.playTileClick();
    const userMsg: LiveComment = {
      id: String(Date.now()),
      username: 'أنت (البطل)',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=faces',
      text: inputComment.trim(),
      time: 'الآن',
    };

    setComments((prev) => [...prev, userMsg]);
    setInputComment('');
  };

  const streamerPercent = Math.round((pkScore.streamer / (pkScore.streamer + pkScore.opponent)) * 100);

  return (
    <div
      onClick={handleTapLikes}
      className="relative w-full h-full flex flex-col justify-between p-2 pointer-events-auto select-none"
    >
      {/* Floating Animated Hearts from Tapping Screen */}
      {floatingHearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute pointer-events-none animate-float-up z-50 transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${heart.x}px`,
            top: `${heart.y}px`,
            color: heart.color,
          }}
        >
          <Heart className="w-8 h-8 fill-current drop-shadow-lg" />
        </div>
      ))}

      {/* Floating Combo Streak Badge */}
      {likeStreak > 3 && (
        <div className="absolute top-28 right-4 z-40 animate-bounce pointer-events-none">
          <div className="bg-gradient-to-r from-rose-500 to-amber-500 text-white font-black text-xs px-3 py-1 rounded-full shadow-2xl border border-white flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 fill-current text-yellow-300" />
            <span>Combo x{likeStreak}!</span>
          </div>
        </div>
      )}

      {/* Top Stream Header: Streamer Profile, Live Badge, Viewers */}
      <div className="w-full flex items-center justify-between gap-1 z-30">
        {/* Streamer Avatar and Live Badge */}
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-slate-700/80 shadow-lg">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&h=60&fit=crop&crop=faces"
              alt="Streamer"
              className="w-8 h-8 rounded-full border-2 border-rose-500 object-cover"
            />
            <span className="absolute -bottom-1 -right-1 bg-rose-600 text-[8px] font-black text-white px-1 rounded-full border border-white uppercase">
              LIVE
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-white leading-tight">TikTok Host</span>
            <span className="text-[10px] text-amber-300 font-bold">{activeGameName}</span>
          </div>
        </div>

        {/* Live Viewer Counter & Likes */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-full border border-slate-700/80 text-white text-xs font-black shadow-md">
            <Users className="w-3.5 h-3.5 text-rose-400" />
            <span>{viewerCount.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-full border border-slate-700/80 text-rose-400 text-xs font-black shadow-md">
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>{likesCount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* PK Live Stream Tug-of-War Battle Bar */}
      <div className="w-full bg-slate-950/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl my-1 z-30">
        <div className="flex items-center justify-between text-[10px] font-black px-2 mb-1">
          <div className="flex items-center gap-1 text-rose-400">
            <Swords className="w-3.5 h-3.5" />
            <span>فريق البث ({streamerPercent}%)</span>
          </div>
          <span className="text-amber-400">تحدي PK الحي ⚔️</span>
          <div className="flex items-center gap-1 text-sky-400">
            <span>فريق المنافس ({100 - streamerPercent}%)</span>
          </div>
        </div>

        {/* Dual Progress Bar */}
        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-rose-600 via-amber-500 to-rose-500 transition-all duration-300"
            style={{ width: `${streamerPercent}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-300 flex-1"
          />
        </div>
      </div>

      {/* Full-Screen Animated Gift Banner (Lion / Galaxy / Crown) */}
      {activeBanner && (
        <div className="absolute inset-x-4 top-1/3 z-50 pointer-events-none animate-bounce">
          <div className="bg-gradient-to-r from-amber-500 via-rose-600 to-purple-600 p-4 rounded-3xl border-2 border-white shadow-2xl flex items-center justify-center gap-4 text-white">
            <span className="text-5xl animate-spin">{activeBanner.icon}</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-yellow-200">{activeBanner.sender}</span>
              <span className="text-lg font-black">{activeBanner.title}</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Area: Live Chat Stream + Gift Launcher Tray */}
      <div className="w-full flex flex-col gap-2 z-30 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        {/* Live Chat Stream Container */}
        <div
          ref={chatScrollRef}
          className="w-full max-w-[320px] max-h-36 overflow-y-auto no-scrollbar flex flex-col gap-1.5 p-1 pointer-events-auto"
        >
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex items-start gap-1.5 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-2xl border border-slate-800/80 text-xs shadow-md animate-fade-in"
            >
              <img
                src={comment.avatar}
                alt={comment.username}
                className="w-4 h-4 rounded-full mt-0.5 object-cover"
              />
              <span className="font-black text-amber-300 flex-shrink-0">
                {comment.username}:
              </span>
              <span className="text-slate-100 font-medium break-all">
                {comment.text}
              </span>
            </div>
          ))}
        </div>

        {/* Input Bar & Gift Tray Toggle */}
        <div className="w-full flex items-center gap-2">
          {/* Chat Form */}
          <form onSubmit={handleSendComment} className="flex-1 flex items-center bg-slate-900/90 rounded-2xl border border-slate-700 px-2 py-1 shadow-lg">
            <input
              type="text"
              value={inputComment}
              onChange={(e) => setInputComment(e.target.value)}
              placeholder="اكتب تعليقاً في البث المباشر..."
              className="flex-1 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none px-1"
              id="input-tiktok-live-chat"
            />
            <button
              type="submit"
              id="btn-send-tiktok-chat"
              className="p-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Gift Tray Toggle Button */}
          <button
            onClick={() => setShowGiftTray(!showGiftTray)}
            id="btn-toggle-gifts-tray"
            className="p-2 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-black shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer border border-white/60 animate-pulse"
            title="هدايا التيك توك الحية"
          >
            <Gift className="w-5 h-5 fill-current" />
          </button>
        </div>

        {/* TikTok Interactive Gifts Tray Panel */}
        {showGiftTray && (
          <div className="w-full bg-slate-950/95 backdrop-blur-xl p-2.5 rounded-3xl border border-slate-800 shadow-2xl flex items-center justify-around gap-1 animate-fade-in">
            {TIKTOK_GIFTS.map((gift) => (
              <button
                key={gift.id}
                id={`btn-send-gift-${gift.id}`}
                onClick={() => triggerSendGift(gift)}
                className="flex flex-col items-center gap-0.5 p-1.5 rounded-2xl hover:bg-slate-900 active:scale-90 transition-all cursor-pointer group"
              >
                <span className="text-2xl transform group-hover:scale-120 transition-transform">
                  {gift.icon}
                </span>
                <span className="text-[10px] font-black text-slate-200">
                  {t[gift.nameKey as keyof typeof t]}
                </span>
                <span className="text-[9px] font-extrabold text-amber-400 flex items-center gap-0.5">
                  🟡 {gift.coins}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
