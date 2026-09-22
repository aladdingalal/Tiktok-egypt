import React from 'react';
import { GameId, SupportedLanguage } from '../types';
import { translations } from '../utils/translations';
import { X, Trophy, Shield, Sparkles, HelpCircle } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGame: GameId;
  lang: SupportedLanguage;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  activeGame,
  lang,
}) => {
  if (!isOpen) return null;
  const t = translations[lang];

  const getRulesContent = () => {
    switch (activeGame) {
      case 'ludo':
        return {
          title: t.gameLudo,
          icon: '🎲',
          description: t.rulesLudo,
          tips: [
            'الرقم 6 على النرد يخرج قطعة من القاعدة ويعطيك رمية حرة إضافية!',
            'إذا هبطت قطعتك على مربع به قطعة الخصم (غير الآمن)، ستأكلها وترجعها لقاعدتها!',
            'المربعات التي تحمل علامة النجمة (★) هي مربعات آمنة لا يمكن أكل القطع فيها.',
            'أول من يدخل قطعه الأربعة إلى مثلث النهاية هو الفائز!',
          ],
        };
      case 'domino':
        return {
          title: t.gameDomino,
          icon: '🀄',
          description: t.rulesDomino,
          tips: [
            'يبدأ الدور صاحب أعلى قطعة مزدوجة (مثل الدوش ٦-٦).',
            'كل لاعب يطابق أحد أرقام قشاطه مع أحد طرفي السلسلة المفتوحة.',
            'إذا لم تجد قشاطاً يطابق، اسحب من ساحة السحب (البون يارد).',
            'إذا أغلقت اللعبة (قفلة)، يفوز اللاعب الذي يملك أقل مجموع نقاط في يده!',
          ],
        };
      case 'tawla':
        return {
          title: t.gameTawla,
          icon: '🪵',
          description: t.rulesTawla,
          tips: [
            'حرك قواشيطك وفقاً لرمية حجري النرد.',
            'رمية المتشابهات (دوش مثل ٤-٤ أو ٦-٦) تمنحك ٤ حركات كاملة!',
            'إذا كان للخصم قشاط وحيد في خانة، يمكنك أكله وإرساله إلى الحبس (البار).',
            'القشاط المحبوس يجب إدخاله مجدداً قبل تحريك أي قشاط آخر.',
            'عند تجميع كل قواشيطك في دارك، ابدأ بإخراجها. أول من يخرج كل قواشيطه يفوز!',
          ],
        };
      case 'uno':
        return {
          title: t.gameUno,
          icon: '🃏',
          description: t.rulesUno,
          tips: [
            'طابق البطاقات حسب اللون أو الرقم مع البطاقة في المنتصف.',
            'بطاقات الأكشن: منع الدور (Skip)، عكس الاتجاه (Reverse)، وسحب بطاقتين (+2).',
            'بطاقة تغيير اللون (Wild) والـ (+4) يمكن لعبها على أي لون.',
            'عندما يتبقى معك بطاقة واحدة فقط، اضغط فوراً على زر (أونووو)!',
          ],
        };
    }
  };

  const details = getRulesContent();

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-slate-100 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{details.icon}</span>
            <h3 className="text-lg font-black text-amber-300">
              {details.title} - {t.rules}
            </h3>
          </div>
          <button
            onClick={onClose}
            id="btn-close-rules"
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Description */}
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold">
          {details.description}
        </p>

        {/* Tips & Pro Rules */}
        <div className="flex flex-col gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>نصائح ذهبية وسهلة للفوز:</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300 font-medium">
            {details.tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* TikTok Live Stream Integration Note */}
        <div className="bg-gradient-to-r from-rose-950/40 to-slate-900 p-3 rounded-2xl border border-rose-500/30 flex items-start gap-2">
          <Trophy className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-200">
            <span className="font-bold text-rose-300 block mb-0.5">
              ميزة البث المباشر (تيك توك لايف):
            </span>
            <span>
              في وضع البث، هدايا المتابعين (مثل الوردة أو الأسد الملك) والتعليقات تمنح حركات إضافية، وتدعم الفرق في المنافسة الحية!
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          id="btn-confirm-close-rules"
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-lg mt-1"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
};
