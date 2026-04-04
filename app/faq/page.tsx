import type { Metadata } from 'next';
import Link from 'next/link';
import { FaqPageJsonLd } from '@/components/seo/FaqPageJsonLd';

export const metadata: Metadata = {
  title: '常見問題',
  description:
    'CafeRoam 啡遊常見問題——什麼是啡遊、AI 搜尋怎麼用、資料怎麼來的、隱私保護等。',
};

const FAQ_ITEMS = [
  {
    question: '啡遊 CafeRoam 是什麼？',
    answer:
      '啡遊是台灣獨立咖啡廳的探索平台。透過 AI 語意搜尋和工作/休息/社交三種模式，幫你找到最適合當下需求的咖啡廳。',
  },
  {
    question: 'AI 搜尋是怎麼運作的？',
    answer:
      '你可以用自然語言描述想要的咖啡廳，例如「有插座可以工作的安靜咖啡廳」。AI 會理解語意，不只是比對關鍵字，從我們的資料庫中找出最符合的店家。',
  },
  {
    question: '工作/休息/社交模式是什麼意思？',
    answer:
      '每間咖啡廳都有三個面向的評分：Work（適合工作程度）、Rest（放鬆程度）、Social（社交友善程度）。你可以根據當下的需求，快速篩選最適合的店。',
  },
  {
    question: '店家資料是怎麼來的？',
    answer:
      '我們結合公開資訊、AI 數據充實、以及使用者打卡回饋來建立店家資料。如果你發現資料有誤，歡迎透過店家頁面回報。',
  },
  {
    question: '我可以提交新的咖啡廳嗎？',
    answer:
      '可以！登入後你可以透過提交功能推薦咖啡廳，我們會審核後加入平台。',
  },
  {
    question: '啡遊是免費的嗎？',
    answer:
      '是的，啡遊完全免費使用。瀏覽、搜尋、建立清單、打卡都不需要付費。',
  },
  {
    question: '我的個人資料安全嗎？',
    answer:
      '我們依照台灣個人資料保護法（PDPA）處理你的資料。不會出售個人資料，刪除帳號後 30 天內會完全清除所有個人資料。詳情請參閱我們的隱私權政策。',
  },
  {
    question: '啡遊跟 Google Maps 有什麼不同？',
    answer:
      '啡遊專注在獨立咖啡廳，提供 AI 語意搜尋和工作/休息/社交三種模式——這些是通用地圖工具沒有的。我們的目標不是取代 Google Maps，而是在「找咖啡廳」這件事上做得更好。',
  },
] as const;

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <FaqPageJsonLd
        items={FAQ_ITEMS.map((item) => ({
          question: item.question,
          answer: item.answer,
        }))}
      />

      <h1 className="text-2xl font-bold">常見問題</h1>
      <p className="text-text-meta mt-1 text-sm">FAQ</p>

      <section className="mt-8 space-y-3">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.question}
            className="group rounded-lg border border-[#e5e7eb] px-4 py-3"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
              {item.question}
              <span className="text-text-meta ml-2 transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <p className="text-text-meta mt-2 text-sm">{item.answer}</p>
          </details>
        ))}
      </section>

      <div className="mt-12 border-t pt-6">
        <Link href="/" className="text-sm underline">
          返回首頁
        </Link>
      </div>
    </main>
  );
}
