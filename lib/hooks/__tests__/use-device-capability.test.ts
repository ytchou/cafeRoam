import { renderHook, waitFor } from '@testing-library/react';
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

  it('a visitor on a 1GB device is treated as low-end and the map does not auto-load', async () => {
    mockDeviceMemory(1);
    const { result } = renderHook(() => useDeviceCapability());
    await waitFor(() => expect(result.current.deviceMemory).toBe(1));
    expect(result.current.isLowEnd).toBe(true);
  });

  it('a visitor on a 2GB device is treated as low-end and the map does not auto-load', async () => {
    mockDeviceMemory(2);
    const { result } = renderHook(() => useDeviceCapability());
    await waitFor(() => expect(result.current.deviceMemory).toBe(2));
    expect(result.current.isLowEnd).toBe(true);
  });

  it('a visitor on a 4GB device is treated as capable and the map loads automatically', async () => {
    mockDeviceMemory(4);
    const { result } = renderHook(() => useDeviceCapability());
    await waitFor(() => expect(result.current.deviceMemory).toBe(4));
    expect(result.current.isLowEnd).toBe(false);
  });

  it('a visitor on an 8GB device is treated as capable and the map loads automatically', async () => {
    mockDeviceMemory(8);
    const { result } = renderHook(() => useDeviceCapability());
    await waitFor(() => expect(result.current.deviceMemory).toBe(8));
    expect(result.current.isLowEnd).toBe(false);
  });

  it('when the deviceMemory API is unavailable, assumes capable to avoid falsely blocking map access', async () => {
    mockDeviceMemory(undefined);
    const { result } = renderHook(() => useDeviceCapability());
    // deviceMemory stays undefined — verify the hook settles on capable
    await waitFor(() => expect(result.current.isLowEnd).toBe(false));
    expect(result.current.deviceMemory).toBeUndefined();
  });
});
