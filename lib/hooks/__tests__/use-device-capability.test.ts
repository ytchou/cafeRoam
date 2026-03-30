import { renderHook } from '@testing-library/react';
import { useDeviceCapability } from '../use-device-capability';

describe('useDeviceCapability', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  function mockDeviceMemory(value: number | undefined) {
    const nav = { ...globalThis.navigator };
    if (value !== undefined) {
      Object.defineProperty(nav, 'deviceMemory', { value, configurable: true });
    }
    Object.defineProperty(globalThis, 'navigator', {
      value: nav,
      writable: true,
      configurable: true,
    });
  }

  it('reports low-end when deviceMemory is 1GB', () => {
    mockDeviceMemory(1);
    const { result } = renderHook(() => useDeviceCapability());
    expect(result.current.isLowEnd).toBe(true);
    expect(result.current.deviceMemory).toBe(1);
  });

  it('reports low-end when deviceMemory is 2GB', () => {
    mockDeviceMemory(2);
    const { result } = renderHook(() => useDeviceCapability());
    expect(result.current.isLowEnd).toBe(true);
    expect(result.current.deviceMemory).toBe(2);
  });

  it('reports capable when deviceMemory is 4GB', () => {
    mockDeviceMemory(4);
    const { result } = renderHook(() => useDeviceCapability());
    expect(result.current.isLowEnd).toBe(false);
    expect(result.current.deviceMemory).toBe(4);
  });

  it('reports capable when deviceMemory is 8GB', () => {
    mockDeviceMemory(8);
    const { result } = renderHook(() => useDeviceCapability());
    expect(result.current.isLowEnd).toBe(false);
    expect(result.current.deviceMemory).toBe(8);
  });

  it('assumes capable when deviceMemory API is unavailable', () => {
    mockDeviceMemory(undefined);
    const { result } = renderHook(() => useDeviceCapability());
    expect(result.current.isLowEnd).toBe(false);
    expect(result.current.deviceMemory).toBeUndefined();
  });
});
