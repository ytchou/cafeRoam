import { useSyncExternalStore } from 'react';

const LOW_END_MEMORY_THRESHOLD_GB = 2;

interface DeviceCapability {
  isLowEnd: boolean;
  deviceMemory: number | undefined;
}

const SERVER_SNAPSHOT: DeviceCapability = { isLowEnd: false, deviceMemory: undefined };

// Computed once on the client — navigator.deviceMemory is read-only and never changes
let clientSnapshot: DeviceCapability | null = null;

function getSnapshot(): DeviceCapability {
  if (clientSnapshot === null) {
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const isLowEnd =
      deviceMemory !== undefined && deviceMemory <= LOW_END_MEMORY_THRESHOLD_GB;
    clientSnapshot = { isLowEnd, deviceMemory };
  }
  return clientSnapshot;
}

export function useDeviceCapability(): DeviceCapability {
  return useSyncExternalStore(
    () => () => {}, // navigator.deviceMemory never changes — no subscription needed
    getSnapshot,
    () => SERVER_SNAPSHOT
  );
}

// Exported for test reset — allows tests to override navigator.deviceMemory between cases
export function _resetDeviceCapabilityCache(): void {
  clientSnapshot = null;
}
