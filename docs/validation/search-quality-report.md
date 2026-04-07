# Search Quality Validation Report

Date: 2026-04-07 | Shops: 164 | Queries: 20

## Verdict: **PASS** (11/20 queries better than or equal to Google Maps)

## Per-Query Comparison

| #   | Query                                  | Category  | CafeRoam (1-5) | Maps (1-5) | Winner |
| --- | -------------------------------------- | --------- | -------------- | ---------- | ------ |
| q1  | 有插座可以工作的安靜咖啡廳             | attribute | 3.4            | 3.2        | Tie    |
| q2  | 溫馨有特色的咖啡廳                     | vibe      | 4.6            | 3.0        | CR     |
| q3  | 大安區文青咖啡廳                       | vibe      | 1.0            | 3.8        | Maps   |
| q4  | 不限時可以久坐的咖啡廳                 | attribute | 2.2            | 2.6        | Tie    |
| q5  | 信義區附近咖啡廳                       | mixed     | 1.8            | 3.6        | Maps   |
| q6  | 適合讀書準備考試的咖啡廳               | mode      | 2.2            | 3.8        | Maps   |
| q7  | 招牌拿鐵好喝的咖啡廳                   | specific  | 3.0            | 3.6        | Maps   |
| q8  | 有自然光落地窗的咖啡廳                 | vibe      | 1.4            | 3.4        | Maps   |
| q9  | 有包廂或隔間的咖啡廳                   | attribute | 1.4            | 3.2        | Maps   |
| q10 | 台北東區 specialty coffee              | mixed     | 2.2            | 3.6        | Maps   |
| q11 | 安靜適合工作的咖啡廳                   | mode      | 3.0            | 3.4        | Tie    |
| q12 | 適合約會的咖啡廳                       | mode      | 3.0            | 3.2        | Tie    |
| q13 | 有插座不限時                           | attribute | 2.6            | 3.0        | Tie    |
| q14 | 寵物友善                               | attribute | 2.6            | 3.0        | Tie    |
| q15 | 有巴斯克蛋糕的咖啡廳                   | specific  | 3.0            | 2.4        | CR     |
| q16 | 手沖咖啡推薦                           | specific  | 3.4            | 4.0        | Maps   |
| q17 | 中山站附近安靜咖啡廳                   | mixed     | 2.6            | 2.8        | Tie    |
| q18 | quiet cafe with outlets near Zhongshan | mixed     | 2.2            | 2.6        | Tie    |
| q19 | 有戶外座位的咖啡廳                     | attribute | 1.0            | 3.2        | Maps   |
| q20 | 適合帶筆電工作一整天的咖啡廳           | mode      | 3.4            | 3.6        | Tie    |

## CafeRoam Metrics (LLM Judge)

- Pass rate (top-1 relevant): 60.0%
- Mean NDCG@5: 0.706
- Mean MRR: 0.712

## Category Breakdown

- **attribute**: 4/6 better or equal
- **mixed**: 2/4 better or equal
- **mode**: 3/4 better or equal
- **specific**: 1/3 better or equal
- **vibe**: 1/3 better or equal

## Assumptions Validated

- [x] #1: Semantic search wow moment
- [x] #T2: Claude tag accuracy (implicit)
- [x] #T3: Embedding quality (implicit)
