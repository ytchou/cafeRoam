import { useSyncExternalStore } from 'react';

const LOW_END_MEMORY_THRESHOLD_GB = 2;

interface DeviceCapability {
  isLowEnd: boolean;
  deviceMemory: number | undefined;
}

const SERVER_SNAPSHOT: DeviceCapability = { isLowEnd: false, deviceMemory: undefined };

function getSnapshot(): DeviceCapability {
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const isLowEnd =
    deviceMemory !== undefined && deviceMemory <= LOW_END_MEMORY_THRESHOLD_GB;
  return { isLowEnd, deviceMemory };
}

export function useDeviceCapability(): DeviceCapability {
  return useSyncExternalStore(
    () => () => {},  // navigator.deviceMemory never changes — no subscription needed
    getSnapshot,
    () => SERVER_SNAPSHOT
  );
}
