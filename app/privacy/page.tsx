import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '隱私權政策',
  description: 'CafeRoam 啡遊個人資料保護政策（依台灣個人資料保護法）',
};

const EFFECTIVE_DATE = '2026-04-03';

const COLLECTION_ITEMS = [
  { label: '帳號資訊', detail: 'Email、社群帳號 ID（Google / Apple）' },
  {
    label: '打卡記錄',
    detail: '打卡照片、評分、文字心得、打卡時間與地點（店家）',
  },
  { label: '使用行為', detail: '搜尋關鍵字、瀏覽頁面（匿名化，不含個人識別資訊）' },
  { label: '裝置資訊', detail: '瀏覽器類型、語系偏好（不含 IP 位址）' },
  { label: '店家認領資料', detail: '認領店家時提供的聯絡人資訊（認領有效期間內保存）' },
];

const PURPOSE_ITEMS = [
  '提供個人化的咖啡廳推薦與 AI 語意搜尋服務',
  '運作核心功能：打卡、極拍牆（Polaroid Wall）、清單',
  '商家資訊數據充實（菜單照片可能被用於更新店家菜單資訊）',
  '以匿名、彙總方式提供驗證店家店主經營數據參考（如瀏覽次數、熱門時段等，不包含任何可辨識個人之資訊）',
];

const RETENTION_ROWS = [
  {
    type: '帳號與個人資料',
    period: '帳號存續期間',
    trigger: '申請刪除帳號後 30 天內完全刪除',
  },
  {
    type: '打卡記錄與照片',
    period: '帳號存續期間',
    trigger: '申請刪除帳號後 30 天內完全刪除',
  },
  {
    type: '極拍牆（Polaroid）',
    period: '帳號存續期間',
    trigger: '申請刪除帳號後 30 天內完全刪除',
  },
  {
    type: '清單資料',
    period: '帳號存續期間',
    trigger: '申請刪除帳號後 30 天內完全刪除',
  },
  {
    type: '店家認領聯絡資料',
    period: '認領有效期間',
    trigger: '撤銷認領或刪除帳號時立即刪除',
  },
  {
    type: '使用行為分析（PostHog）',
    period: '最長 24 個月（滾動式）',
    trigger: '自動過期；僅匿名 ID，無 PII',
  },
  {
    type: '彙總店家數據',
    period: '無限期（已非個人資料）',
    trigger: '不適用；為彙總計數，不含個人識別資訊',
  },
  {
    type: '搜尋記錄',
    period: '最長 12 個月（滾動式）',
    trigger: '自動過期；僅查詢字串，無使用者 ID',
  },
];

const RIGHTS_ITEMS = [
  '查閱您的個人資料',
  '要求更正不正確的資料',
  '申請刪除帳號及所有個人資料（30 天內完成）',
  '撤回對店家數據共享的同意（可於個人設定中選擇退出）',
  '限制特定目的之資料處理',
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold">隱私權政策</h1>
      <p className="text-text-meta mt-1 text-sm">生效日期：{EFFECTIVE_DATE}</p>
      <p className="text-text-meta mt-0.5 text-xs">
        依據《個人資料保護法》（Taiwan PDPA）訂定
      </p>

      <section className="mt-8 space-y-8">
        {/* 1. Data Controller */}
        <div>
          <h2 className="text-lg font-semibold">1. 資料控制者</h2>
          <p className="mt-2 text-sm">
            CafeRoam 啡遊（以下稱「本平台」）為本隱私權政策所稱之個人資料控制者。
            如有資料保護相關問題，請透過下方聯絡方式與我們聯繫。
          </p>
        </div>

        {/* 2. What We Collect */}
        <div>
          <h2 className="text-lg font-semibold">2. 我們收集的資料</h2>
          <ul className="mt-2 space-y-1.5">
            {COLLECTION_ITEMS.map((item) => (
              <li key={item.label} className="text-sm">
                <strong>{item.label}：</strong>
                {item.detail}
              </li>
            ))}
          </ul>
        </div>

        {/* 3. Purposes */}
        <div>
          <h2 className="text-lg font-semibold">3. 使用目的</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
            {PURPOSE_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {/* 4. Anonymization */}
        <div>
          <h2 className="text-lg font-semibold">4. 匿名化與資料保護措施</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
            <li>
              使用行為分析事件採用 SHA-256 雜湊後的使用者 ID，不記錄原始帳號資訊。
            </li>
            <li>
              提供給店主的數據僅為彙總計數，並採用 k-匿名性（k≥10）：
              當特定族群的使用者人數少於 10 人時，該項數據將顯示「資料不足」，不予揭露。
            </li>
            <li>人口統計數據（年齡層、性別）採週/月級別彙總，不提供逐日數據。</li>
            <li>
              彙總數據不得與其他資料集交叉比對以還原個人身份，此義務亦透過店主服務條款約束。
            </li>
          </ul>
        </div>

        {/* 5. Third-party Sharing */}
        <div>
          <h2 className="text-lg font-semibold">5. 第三方資料共享</h2>
          <div className="mt-2 space-y-2 text-sm">
            <p>
              <strong>驗證店主：</strong>
              取得店家認領資格的店主可存取其店家的彙總、匿名化使用數據（如總瀏覽次數、熱門到訪時段）。
              不傳輸任何個人資料。
            </p>
            <p>
              <strong>服務供應商：</strong>
              我們使用 Supabase（資料庫與儲存）、PostHog（分析）、Sentry（錯誤追蹤）、
              Resend（電子郵件）等服務供應商。這些供應商依照資料處理協議運作，不得將資料用於其他目的。
            </p>
            <p>
              <strong>我們不出售個人資料。</strong>
            </p>
          </div>
        </div>

        {/* 6. User Rights */}
        <div>
          <h2 className="text-lg font-semibold">6. 您的 PDPA 權利</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
            {RIGHTS_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-text-meta mt-2 text-sm">
            如需行使上述權利，請透過下方聯絡方式提交請求，我們將於 30
            天內處理。
          </p>
        </div>

        {/* 7. Data Retention */}
        <div>
          <h2 className="text-lg font-semibold">7. 資料保存期限</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-semibold">資料類型</th>
                  <th className="py-2 pr-4 text-left font-semibold">保存期間</th>
                  <th className="py-2 text-left font-semibold">刪除時機</th>
                </tr>
              </thead>
              <tbody>
                {RETENTION_ROWS.map((row) => (
                  <tr key={row.type} className="border-b last:border-0">
                    <td className="py-2 pr-4 align-top font-medium">{row.type}</td>
                    <td className="text-text-meta py-2 pr-4 align-top">
                      {row.period}
                    </td>
                    <td className="text-text-meta py-2 align-top">{row.trigger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 8. Photo Usage */}
        <div>
          <h2 className="text-lg font-semibold">8. 打卡照片使用說明</h2>
          <p className="mt-2 text-sm">
            您在打卡時上傳的菜單照片，可能被用於改善平台上的店家資訊（例如更新菜單品項與價格）。
            此用途已包含在您簽署個人資料同意書時所揭露的目的範圍內。
            您可隨時申請刪除帳號，所有打卡照片將在 30 天內自 Supabase Storage 完全刪除。
          </p>
        </div>

        {/* 9. Contact */}
        <div>
          <h2 className="text-lg font-semibold">9. 聯絡方式</h2>
          <p className="mt-2 text-sm">
            如有個人資料保護相關問題或行使權利之需求，請聯繫：
          </p>
          <p className="mt-1 text-sm font-medium">
            CafeRoam 啡遊 — 資料保護窗口
            <br />
            Email：privacy@caferoam.tw
          </p>
        </div>
      </section>

      <div className="mt-12 border-t pt-6">
        <Link href="/" className="text-sm underline">
          返回首頁
        </Link>
      </div>
    </main>
  );
}
