# ADR: Heavy GEO investment with FAQ schema on shop pages

Date: 2026-03-25

## Decision
Invest heavily in Generative Engine Optimization (GEO) from Phase 1, including llms.txt, AI bot allowances, and auto-generated FAQPage JSON-LD schema on every shop detail page.

## Context
CafeRoam needs to be discoverable not just via traditional search engines but also through AI-powered assistants (ChatGPT, Perplexity, Google AI Overviews). The Taiwan cafe discovery space is not yet crowded in AI search results, creating a first-mover opportunity. Shop taxonomy data (mode scores, vibe tags, MRT stations) provides rich structured content that can be auto-converted into FAQ answers.

## Alternatives Considered
- **GEO basics only (llms.txt + robots.txt)**: Lower effort, but misses the opportunity to make individual shop pages citable by AI engines. Rejected: insufficient for "heavy GEO" goal.
- **Traditional SEO only (skip GEO)**: Focus purely on Google/Bing crawlability. Rejected: AI search is growing fast and CafeRoam's structured data is a natural fit for AI citation.

## Rationale
CafeRoam's taxonomy data (5 dimensions of tags + mode scores) maps directly to natural-language questions people ask about cafes. Auto-generating FAQ schema from this data is low-effort (data already exists) and high-value (gives AI engines structured, citable answers per shop). The llms.txt file provides AI crawlers with site-level context that no competitor in the Taiwan cafe space currently offers.

## Consequences
- Advantage: First-mover in Taiwan cafe GEO — AI assistants can cite CafeRoam shop data directly
- Advantage: FAQ content improves traditional SEO too (rich snippets, People Also Ask)
- Advantage: Zero editorial overhead — FAQ is auto-generated from existing taxonomy data
- Disadvantage: FAQ quality depends on taxonomy data completeness (shops with few tags get thin FAQ)
- Disadvantage: GEO is an emerging field — ROI is uncertain and hard to measure until DEV-30 (GA4) ships
