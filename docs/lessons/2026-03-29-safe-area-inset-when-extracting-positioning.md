# Safe-area inset silently dropped when extracting fixed positioning to parent container

**Date:** 2026-03-29
**Context:** DEV-85 BottomNav overlay fix — `embedded` prop moved positioning responsibility from BottomNav to its parent container in MapMobileLayout.

**What happened:**
When `embedded={true}`, BottomNav drops its `style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}` inline style (correct). But the parent container that took over the bottom spacing only got a static `pb-2` (8px). On iPhone X+ devices, `env(safe-area-inset-bottom)` is ~34px — the nav would have been clipped behind the iOS home indicator.

**Root cause:**
Two-component contract: the original component owned both positioning AND safe-area handling. When positioning moved to the parent, safe-area awareness didn't follow.

**Prevention:**
When extracting fixed/absolute positioning from a self-contained component into a parent container:
1. Check if the original component handled `env(safe-area-inset-bottom)`, `env(safe-area-inset-top)`, or similar device-specific CSS
2. If so, add the equivalent `style={{ paddingBottom: 'max(Xrem, env(safe-area-inset-bottom))' }}` to the container — not the hardcoded Tailwind class alone
3. Test on a physical notched device or use browser DevTools → Sensors → Override screen type to test safe-area values
