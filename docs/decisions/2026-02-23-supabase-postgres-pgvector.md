# ADR: Supabase (Postgres + pgvector) for Database, Auth, and Storage

Date: 2026-02-23

## Decision

Use Supabase as the single backend platform: Postgres 15 with pgvector for the database and semantic search, Supabase Auth for authentication, and Supabase Storage for check-in/menu photos.

## Context

CafeRoam requires: (1) a relational database for shop data, user data, lists, check-ins; (2) vector search for semantic queries; (3) user authentication; (4) file storage for check-in photos. Each could be served by separate specialized tools, or by one integrated platform.

## Alternatives Considered

- **Neon + Clerk + S3**: Neon for Postgres + pgvector, Clerk for auth, S3 for storage. Rejected: more composable but significantly more setup work for a solo developer on a 2-4 week timeline. Three separate platforms to manage, three billing accounts, three API integrations.
- **PlanetScale + Pinecone + Firebase Auth**: PlanetScale doesn't support pgvector; Pinecone is a separate vector database. Rejected: split data stores add complexity to search (join across systems) and cost.
- **Self-hosted Postgres on Railway**: Full control, cheapest at scale. Rejected: database operations (backups, upgrades, monitoring) are a solo-dev maintenance burden. Not the right tradeoff for a lifestyle business.

## Rationale

Supabase combines everything needed in one platform with a generous free tier (500MB DB, 1GB storage, 50K MAU). pgvector is a first-class Postgres extension — semantic search runs in the same database as relational queries, enabling efficient hybrid search without cross-system joins. Supabase Auth provides JWT sessions with Row Level Security enforcement built in. The Supabase CLI enables full local development via Docker.

The vendor dependency is real (acknowledged in SPEC.md trade-offs). For a solo-dev lifestyle business, the speed-to-launch advantage outweighs the flexibility cost.

## Consequences

- Advantage: One platform for DB + vector search + auth + storage — single dashboard, single bill
- Advantage: pgvector runs in-DB — hybrid search (vector + relational filter) is a single SQL query
- Advantage: Supabase CLI enables full local dev without cloud credentials
- Advantage: Row Level Security enforced at the database layer — PDPA compliance is stronger
- Disadvantage: Vendor lock-in — moving off Supabase requires migrating DB, auth, and storage separately
- Disadvantage: Free tier limits (500MB DB, 50K MAU) — upgrade to Pro ($25/mo) when traffic grows
- Locked into: Supabase Auth JWT format, Supabase Storage bucket structure
