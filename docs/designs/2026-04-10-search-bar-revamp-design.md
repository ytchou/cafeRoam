# DEV-314: Search Bar Revamp Design

**Date:** 2026-04-10
**Ticket:** DEV-314

## Context

Three problems on the homepage hero search surfaced together as a cohesive UX revamp:

1. **Text visibility bug** — typed characters in the hero search input render invisible. Root cause: `components/discovery/search-bar.tsx:56` — input has `bg-white` but no explicit text color. Parent hero section (`app/page.tsx:261`) declares `text-white`; Tailwind preflight makes inputs inherit `color`. Fix: add `text-gray-900 placeholder:text-gray-400`.

2. **Duplicate search bar** — `StickySearchBar` (IntersectionObserver-toggled) duplicates the hero search bar. It adds complexity without user value at current scale.

3. **Search hit rate is low** — free-form input with 8 hardcoded long-sentence chips leaves users guessing what the system can handle.

## Solution: A+B+C Combined Search

A single unified search component with state-driven display — the three approaches (autocomplete, suggestion panel, tag chips) are combined into one coherent UX rather than choosing one direction.

### State machine (tracks `input.value` only — no focus/blur distinction)

| Input state | What renders below the search bar |
|---|---|
| Empty (default) | Short semantic phrase chips — always visible, no interaction needed |
| Typing (`value !== ""`) | Unified panel: backend completions (A) on top + taxonomy tag chips (C) below |
| Tag chip clicked | Tag token inserted inline in bar `[安靜 ×]`; user continues typing free text |

### Default state — short phrase chips

8–10 short semantic phrases (2–4 words) — human-readable, warm, but map to taxonomy terms internally:

```
安靜可以工作   適合約會   好拍照   有黑膠唱片
可以帶狗       下午茶推薦  有插座   不限時
```

Always visible without any interaction. Click → submit that phrase as query.

### Typing state — unified A+C panel

Single white dropdown panel below input, two sections:
1. **建議搜尋** — backend completions, 3–5 rows, icon + text, click → submit query
2. **相關標籤** — taxonomy tag chips, horizontal scroll, click → add token to bar

### Token state — multi-token bar

The search bar renders tag token pills alongside free text:
```
[🏷 安靜 ×][🏷 有插座 ×] 可以工作的地方▌   [🔍]
```
- Tokens → `filters: string[]` in `useSearchState` (existing, no schema changes)
- Free text → `query: string` in `useSearchState` (existing, no schema changes)
- Backspace on empty text input removes last token

## Components

### SearchInputTokens (replaces SearchBar)
Renders tag token pills + free text input in one `rounded-full` bar. Token pill = `[label ×]`. Props: `value`, `tokens`, `onValueChange`, `onTokenRemove`, `onSubmit`, `autoFocus?`.

### SearchSuggestionPanel (replaces SuggestionChips)
Manages all three states based on `query` prop.
- `query === ""` → 2-row chip grid (short phrases), always visible below search bar
- `query !== ""` → white dropdown panel (建議搜尋 completions + 相關標籤 chips)
- Props: `query`, `onPhraseSelect`, `onTagSelect`, `onNearMe?`

### useSearchSuggestions(query: string)
New hook. Debounced 300ms fetch to `/api/search/suggest?q=`.
- Only fires when `query.length >= 1`
- Returns `{ completions: string[], tags: { id: string, label: string }[], isLoading: boolean }`

## Backend Endpoint

`GET /search/suggest?q=<partial>` in `backend/routers/search.py`
- Prefix + fuzzy match against `taxonomy_tags.label_zh` + curated high-quality phrases
- Returns max 5 completions + max 8 tag suggestions
- Quality > speed — no caching in V1

Response shape:
```json
{
  "completions": ["安靜可以工作的咖啡廳", "安靜閱讀"],
  "tags": [
    { "id": "tag_quiet_ambience", "label": "安靜" },
    { "id": "tag_workspace", "label": "可以工作" }
  ]
}
```

### Next.js proxy
`app/api/search/suggest/route.ts` — thin proxy to Python backend, same `proxyToBackend` pattern as `app/api/search/route.ts`.

## Testing Classification

**(a) New e2e journey?**
- [ ] No — existing search flow is unchanged; suggestion panel is purely additive

**(b) Coverage gate impact?**
- [x] Yes — `search_service.suggest()` is a new critical-path method; verify 80% coverage gate for `search_service`

## Files Changed

| File | Change |
|---|---|
| `components/discovery/search-bar.tsx:56` | Add `text-gray-900 placeholder:text-gray-400` |
| `components/discovery/sticky-search-bar.tsx` | **Delete** |
| `app/page.tsx` | Remove sticky bar wrapper + imports + IntersectionObserver; wire new components |
| `components/discovery/search-input-tokens.tsx` | **New** |
| `components/discovery/search-suggestion-panel.tsx` | **New** |
| `lib/hooks/use-search-suggestions.ts` | **New** |
| `app/api/search/suggest/route.ts` | **New** — Next.js proxy |
| `backend/routers/search.py` | Add `GET /search/suggest` route |
| `backend/services/search_service.py` | Add `suggest()` method + `SuggestResponse` model |
