# Space-as-sentinel anti-pattern for boolean UI state
**Date:** 2026-03-20
**Context:** SavePopover create-new-list input visibility control

## What happened
`newListName` was initialized to `' '` (single space) to signal "new list input is open." The visibility guard `newListName.trim() !== ''` was always false because `' '.trim() === ''` — the create-list input was permanently unreachable.

## Root cause
Using a string field's value to encode a boolean state (visible/hidden) while also using it for the actual string value. The trim guard meant to check "user typed something" accidentally also evaluated the sentinel as empty.

## Prevention
Never dual-purpose a field value as both state signal and data. Use an explicit boolean: `const [showInput, setShowInput] = useState(false)`. The data field (`newListName`) stays empty string; the visibility is its own state variable. This also makes the reset logic on close obvious: reset both independently.
