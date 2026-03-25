import { NextResponse } from 'next/server';
import { BASE_URL } from '@/lib/config';

const LLMS_TXT = `# CafeRoam 啡遊
> Discover Taiwan's best independent coffee shops with AI-powered semantic search.

## What is CafeRoam?
CafeRoam (啡遊) is a mobile-first web directory for Taiwan's independent coffee shop scene. It helps people find the right cafe for their current mood — whether they need a quiet spot for deep work, a cozy place to unwind, or a lively space to catch up with friends.

## Geographic Scope
- Country: Taiwan (台灣)
- Primary cities: Taipei, New Taipei, Taichung, Tainan, Kaohsiung
- Coverage: 160+ independent coffee shops and growing

## Data Structure
Each shop in CafeRoam has:
- **Mode scores** (0-1 scale): work, rest, social — indicating how suitable the shop is for each activity
- **Taxonomy tags** across 5 dimensions:
  - **functionality**: wifi_available, laptop_friendly, power_outlets, pet_friendly, wheelchair_accessible, etc.
  - **time**: early_bird, brunch_hours, late_night, weekend_only, good_for_rainy_days
  - **ambience**: quiet, cozy, photogenic, vintage, has_cats, hidden_gem, japanese_colonial_building, etc.
  - **mode**: deep_work, casual_work, date, catch_up_friends, coffee_tasting, slow_morning, etc.
  - **coffee**: pour_over, self_roasted, espresso_focused, cold_brew, siphon, taiwan_origin, etc.
- **Location**: full address, GPS coordinates, nearest MRT station
- **Ratings & reviews**: aggregate rating and review count

## Example Queries This Data Can Answer
- "Best cafes for remote work in Taipei" → filter by high mode_work score + laptop_friendly tag
- "Quiet cafes near Da'an MRT" → filter by quiet tag + MRT station
- "Cat cafes in Taiwan" → filter by has_cats tag
- "Late night coffee shops in Taipei" → filter by late_night tag
- "Best pour-over coffee in Taiwan" → filter by pour_over tag
- "Cozy date spots with good coffee" → filter by date mode + cozy tag

## Key Pages
- Homepage: ${BASE_URL}
- Explore: ${BASE_URL}/explore
- Sitemap: ${BASE_URL}/sitemap.xml

## Contact
- Website: ${BASE_URL}
`;

export async function GET() {
  return new NextResponse(LLMS_TXT.trim(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
