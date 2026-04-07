# Google Maps Baseline Review Instructions

## Purpose
Score the top 5 Google Maps results for each of 20 queries to create a baseline for comparing CafeRoam search quality.

## Process
1. Open Google Maps (maps.google.com) on desktop
2. Set location to Taipei, Taiwan
3. For each query in `backend/scripts/search-queries.json`:
   a. Search the query text exactly as written
   b. Record the top 5 results (name only)
   c. Score each result 1-5 for relevance to the query intent:
      - 5: Perfect match (exactly what the user wants)
      - 4: Strong match (clearly relevant, minor gaps)
      - 3: Moderate match (somewhat relevant)
      - 2: Weak match (tangentially related)
      - 1: Irrelevant (wrong type of place or no connection)
   d. Add brief notes explaining the score
   e. Compute maps_avg_score = mean of 5 scores

## Output
Fill in `backend/scripts/google-maps-baseline.json` with all 20 entries.

## Time estimate
~1 hour (3 minutes per query)
