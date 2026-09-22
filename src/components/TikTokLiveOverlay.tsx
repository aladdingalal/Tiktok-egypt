import React, { useState, useEffect, useRef } from 'react';
import { LiveComment, TikTokGift, SupportedLanguage } from '../types';
import { sound } from '../utils/sound';
import { translations } from '../utils/translations';
import confetti from 'canvas-confetti';
import { Heart, Send, Sparkles, MessageCircle, Flame, Users, Gift, Crown, Share2 } from 'lucide-react';

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
];

export const TikTokLiveOverlay: React.FC<TikTokLiveOverlayProps> = ({
  lang,
  onSendGift,
  activeGameName,
}) => {
  const t = translations[lang];

  const [viewerCount, setViewerCount] = useState<number>(18420);
  const [likesCount, setLikesCount] = useState<number>(45890);
  const [comments, setComments] = useState<LiveComment[]>(INITIAL_COMMENTS);
  const [inputComment, setInputComment] = useState<string>('');
  const [activeBanner, setActiveBanner] = useState<{ icon: string; title: string; sender: string } | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Fluctuating viewers & random automated chat stream
  useEffect(() => {
    const interval = setInterval(() => {
      // Small viewer variation
      setViewerCount((prev) => prev + Math.floor(Math.random() * 21) - 10);

      // Random viewer comment
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
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  // Auto scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [comments]);

  // Handle tap to send hearts/likes
  const handleTapLikes = (e: React.MouseEvent) => {
    sound.playTileClick();
    setLikesCount((prev) => prev + 1);

    const heartId = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setFloatingHearts((prev) => [...prev, { id: heartId, x, y }]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 1000);
  };

  // Handle custom user comment in chat
  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputComment.trim()) return;

    sound.playTileClick();
    const myComment: LiveComment = {
      id: String(Date.now()),
      username: 'أنت (المشارك)',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=streamer',
      text: inputComment.trim(),
      time: 'الآن',
    };

    setComments((prev) => [...prev.slice(-8), myComment]);
    setInputComment('');
  };

  // Handle Gift trigger
  const handleGiftClick = (gift: TikTokGift) => {
    sound.playGiftSound(gift.effect);
    onSendGift(gift);

    // Screen Takeover for Lion or Galaxy
    if (gift.effect === 'lion') {
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.4 } });
      setActiveBanner({
        icon: '🦁',
        title: 'الأسد الملك وصل البث!',
        sender: 'هدية أسطورية من أحد المتابعين!',
      });
      setTimeout(() => setActiveBanner(null), 3500);
    } else if (gift.effect === 'galaxy') {
      confetti({ particleCount: 150, spread: 80, colors: ['#8b5cf6', '#3b82f6', '#ec4899'] });
      setActiveBanner({
        icon: '🚀',
        title: 'مجرة التيك توك الفضائية!',
        sender: 'دعم فضائي للبث المباشر!',
      });
      setTimeout(() => setActiveBanner(null), 3000);
    } else {
      confetti({ particleCount: 60, spread: 50 });
    }

    // Add gift alert to chat
    const giftComment: LiveComment = {
      id: String(Date.now()),
      username: 'متابع مخلص',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=VIP',
      text: `أرسل ${t[gift.nameKey as keyof typeof t]}! ${gift.icon}`,
      gift: { name: gift.nameKey, icon: gift.icon, count: 1 },
      time: 'الآن',
    };
    setComments((prev) => [...prev.slice(-8), giftComment]);
  };

  return (
    <>
      {/* Mega Gift Takeover Banner (Lion / Galaxy) */}
      {activeBanner && (
        <div className="absolute inset-x-4 top-20 z-50 pointer-events-none flex flex-col items-center justify-center animate-bounce">
          <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-rose-500 text-slate-950 p-4 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.8)] border-2 border-white flex items-center gap-4 max-w-sm w-full">
            <span className="text-4xl sm:text-5xl">{activeBanner.icon}</span>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-black tracking-wide">
                {activeBanner.title}
              </span>
              <span className="text-xs font-bold text-slate-800">
                {activeBanner.sender}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top TikTok Live Streamer HUD Header */}
      <div className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-transparent z-30">
        {/* Streamer Avatar & Live Badge */}
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md p-1 pr-3 rounded-full border border-slate-700/80 shadow-md">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&h=60&fit=crop&crop=faces"
              alt="Streamer"
              className="w-8 h-8 rounded-full border-2 border-rose-500 object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-white">
                تيك توك جيمز لايف
              </span>
              <span className="bg-rose-600 text-[9px] font-black text-white px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                LIVE
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-300 font-semibold">
              <span className="flex items-center gap-1 text-rose-400">
                <Heart className="w-2.5 h-2.5 fill-current" />
                {likesCount.toLocaleString()}
              </span>
              <span>•</span>
              <span className="text-amber-300 font-bold">{activeGameName}</span>
            </div>
          </div>
        </div>

        {/* Live Viewers Count */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 text-xs font-black text-slate-200 shadow-md">
          <Users className="w-3.5 h-3.5 text-rose-400" />
          <span>{viewerCount.toLocaleString()}</span>
        </div>
      </div>

      {/* Floating Animated Hearts */}
      {floatingHearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute pointer-events-none text-rose-500 animate-float-up z-40"
          style={{ left: `${heart.x}px`, top: `${heart.y}px` }}
        >
          <Heart className="w-6 h-6 fill-current drop-shadow-lg" />
        </div>
      ))}

      {/* Bottom Live Chat Box & Gift Tray */}
      <div className="w-full flex flex-col gap-2 p-2 z-30 pointer-events-none">
        {/* Transparent Scrolling Chat */}
        <div
          ref={chatScrollRef}
          className="w-full max-w-sm max-h-36 overflow-y-auto space-y-1.5 p-1 no-scrollbar pointer-events-auto"
        >
          {comments.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-2 px-3 py-1 rounded-2xl backdrop-blur-md text-xs font-semibold shadow-sm w-fit max-w-[90%] transition-all ${
                c.gift
                  ? 'bg-gradient-to-r from-amber-500/30 to-rose-500/30 border border-amber-400/50 text-amber-200'
                  : 'bg-slate-900/75 border border-slate-800 text-slate-200'
              }`}
            >
              <img
                src={c.avatar}
                alt={c.username}
                className="w-4 h-4 rounded-full flex-shrink-0"
                referrerPolicy="no-referrer"
              />
              <span className="text-slate-400 text-[11px] font-bold">
                {c.username}:
              </span>
              <span className="text-slate-100">{c.text}</span>
            </div>
          ))}
        </div>

        {/* TikTok Interactive Gift Selector Bar */}
        <div className="w-full flex items-center justify-between gap-1 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-2xl pointer-events-auto overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5">
            {TIKTOK_GIFTS.map((g) => (
              <button
                key={g.id}
                id={`btn-tiktok-gift-${g.id}`}
                onClick={() => handleGiftClick(g)}
                className="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-slate-800/80 active:scale-90 transition-all cursor-pointer group"
                title={`${t[g.nameKey as keyof typeof t]} (${g.coins} كوين)`}
              >
                <span className="text-xl sm:text-2xl group-hover:scale-125 transition-transform">
                  {g.icon}
                </span>
                <span className="text-[9px] font-extrabold text-amber-300">
                  {g.coins} 🪙
                </span>
              </button>
            ))}
          </div>

          {/* Tap-to-Like Heart Button */}
          <button
            onClick={handleTapLikes}
            id="btn-tiktok-like"
            className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 text-white shadow-lg hover:brightness-110 active:scale-90 transition-all cursor-pointer ring-2 ring-white/20"
            title={t.tapToCheer}
          >
            <Heart className="w-5 h-5 fill-current" />
          </button>
        </div>

        {/* Live Chat Input */}
        <form
          onSubmit={handleSendComment}
          className="w-full flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-lg pointer-events-auto"
        >
          <input
            type="text"
            id="input-tiktok-chat"
            value={inputComment}
            onChange={(e) => setInputComment(e.target.value)}
            placeholder={t.commentPlaceholder}
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            id="btn-submit-tiktok-chat"
            className="p-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </>
  );
};
