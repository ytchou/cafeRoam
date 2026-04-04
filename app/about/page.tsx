import type { Metadata } from 'next';
import Link from 'next/link';
import { OrganizationJsonLd } from '@/components/seo/OrganizationJsonLd';

export const metadata: Metadata = {
  title: '關於啡遊',
  description:
    'CafeRoam 啡遊是台灣獨立咖啡廳探索平台，透過 AI 語意搜尋與工作/休息/社交三種模式，幫你找到最適合的咖啡廳。',
};

const HOW_IT_WORKS = [
  {
    title: '🔍 AI 語意搜尋',
    description:
      '用自然語言描述你想要的咖啡廳——「安靜可以久坐的」「有好喝手沖的」——AI 會理解你的意思，不只是關鍵字比對。',
  },
  {
    title: '☕ 三種探索模式',
    description:
      '每間咖啡廳都有工作 (Work)、休息 (Rest)、社交 (Social) 三個面向的評分，幫你快速找到最符合當下需求的店。',
  },
  {
    title: '📸 打卡與極拍牆',
    description:
      '造訪咖啡廳後留下打卡記錄，建立你的極拍牆 (Polaroid Wall)——屬於你的咖啡廳探索足跡。',
  },
] as const;

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <OrganizationJsonLd />

      <h1 className="text-2xl font-bold">關於啡遊 CafeRoam</h1>
      <p className="text-text-meta mt-1 text-sm">台灣獨立咖啡廳的探索入口</p>

      <section className="mt-8 space-y-8">
        <div>
          <h2 className="text-lg font-semibold">我們在做什麼</h2>
          <p className="mt-2 text-sm">
            啡遊 (CafeRoam)
            是一個為台灣咖啡愛好者打造的探索平台。我們相信，找到一間好咖啡廳不該靠運氣——不管你是想找個安靜角落專心工作、跟朋友聊天的舒服空間、還是一個人放空的好地方，啡遊都能幫你找到。
          </p>
          <p className="mt-2 text-sm">
            我們專注在台灣的獨立咖啡廳，不是連鎖店。每一間店都有自己的個性，而啡遊的任務就是幫你發現這些個性，找到最適合你的那一間。
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">怎麼運作的</h2>
          <div className="mt-2 space-y-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.title}>
                <h3 className="text-sm font-medium">{item.title}</h3>
                <p className="text-text-meta mt-1 text-sm">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">誰在做這件事</h2>
          <p className="mt-2 text-sm">
            啡遊是一個獨立開發的專案，由一位同樣熱愛咖啡廳的開發者打造。我們沒有大團隊，但有一個簡單的信念：好的工具應該讓探索變得更容易、更有趣。
          </p>
        </div>
      </section>

      <div className="mt-12 border-t pt-6">
        <Link href="/" className="text-sm underline">
          開始探索
        </Link>
      </div>
    </main>
  );
}
