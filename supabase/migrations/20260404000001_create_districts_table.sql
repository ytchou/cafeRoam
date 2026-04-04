-- Districts reference table for geo landing pages (DEV-201)
CREATE TABLE IF NOT EXISTS public.districts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name_en       TEXT NOT NULL,
  name_zh       TEXT NOT NULL,
  description_en TEXT,
  description_zh TEXT,
  city          TEXT NOT NULL DEFAULT 'taipei',
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  shop_count    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_districts_active
  ON public.districts (sort_order)
  WHERE is_active = true;

-- RLS: public read
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Districts are publicly readable"
  ON public.districts FOR SELECT
  USING (true);

-- Seed Taipei districts
INSERT INTO public.districts (slug, name_en, name_zh, description_en, description_zh, sort_order) VALUES
  ('da-an',       'Da''an',       '大安區', 'Coffee culture hub — home to Yongkang Street, NTU, and the highest concentration of specialty cafes in Taipei.', '咖啡文化重鎮——永康街、台大商圈，獨立咖啡廳密度最高的區域。', 1),
  ('zhongshan',   'Zhongshan',    '中山區', 'Art galleries meet third-wave coffee in this walkable district between Zhongshan and Shuanglian MRT.', '藝廊與精品咖啡廳交匯，中山站至雙連站之間的漫步好去處。', 2),
  ('songshan',    'Songshan',     '松山區', 'From Minsheng Community to Songshan Cultural Park — a neighborhood rich in design studios and quiet work cafes.', '民生社區到松山文創園區——設計工作室與靜謐工作咖啡廳的集散地。', 3),
  ('xinyi',       'Xinyi',        '信義區', 'Taipei''s modern core with cafes tucked between skyscrapers, department stores, and tree-lined alleys.', '台北現代核心區，摩天大樓與百貨之間藏著巷弄咖啡廳。', 4),
  ('zhongzheng',  'Zhongzheng',   '中正區', 'Historic heart of Taipei — government district by day, indie cafe scene around Guting and Taipower by night.', '台北歷史中心——白天是政府區，古亭與台電大樓周邊則是獨立咖啡廳聚落。', 5),
  ('wanhua',      'Wanhua',       '萬華區', 'Taipei''s oldest neighborhood, where traditional markets and temples share blocks with emerging specialty cafes.', '台北最古老的街區，傳統市場與廟宇旁的新興精品咖啡廳。', 6),
  ('datong',      'Datong',       '大同區', 'Heritage meets renewal in Dadaocheng and Dihua Street — restored shophouses now house atmospheric cafes.', '大稻埕與迪化街的老屋新生——修復的老房子裡藏著氣氛咖啡廳。', 7),
  ('neihu',       'Neihu',        '內湖區', 'Tech park cafes and lakeside hideaways — Neihu''s coffee scene caters to the office crowd and weekend hikers alike.', '科技園區與湖畔秘境——內湖的咖啡廳服務上班族也吸引週末登山客。', 8),
  ('shilin',      'Shilin',       '士林區', 'Beyond the night market — Tianmu''s international dining scene includes some of Taipei''s most unique cafe spaces.', '不只是夜市——天母的國際餐飲圈中有台北最獨特的咖啡空間。', 9),
  ('beitou',      'Beitou',       '北投區', 'Hot springs district with cozy mountain-side cafes, perfect for a slow afternoon away from the city center.', '溫泉鄉的山邊小咖啡廳，適合遠離市中心的悠閒午後。', 10),
  ('wenshan',     'Wenshan',      '文山區', 'Tea country meets coffee culture — Maokong''s hillside cafes offer views and tranquility alongside Muzha''s neighborhood spots.', '茶鄉遇上咖啡文化——貓空山上的景觀咖啡廳與木柵社區小店。', 11),
  ('nangang',     'Nangang',      '南港區', 'An emerging cafe scene around Nangang Software Park and CITYLink, fueled by the tech community.', '南港軟體園區與 CITYLink 周邊的新興咖啡圈，科技社群帶動。', 12);
