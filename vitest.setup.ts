import '@testing-library/jest-dom/vitest';

// Provide a placeholder Mapbox token so components that check for it don't
// bail out early with a non-rendering fallback, which would fail map tests.
process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test_placeholder';
