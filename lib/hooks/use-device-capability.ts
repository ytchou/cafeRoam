const LOW_END_MEMORY_THRESHOLD_GB = 2;

interface DeviceCapability {
  isLowEnd: boolean;
  deviceMemory: number | undefined;
}

export function useDeviceCapability(): DeviceCapability {
  const deviceMemory =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
      : undefined;

  const isLowEnd =
    deviceMemory !== undefined && deviceMemory <= LOW_END_MEMORY_THRESHOLD_GB;

  return { isLowEnd, deviceMemory };
}
