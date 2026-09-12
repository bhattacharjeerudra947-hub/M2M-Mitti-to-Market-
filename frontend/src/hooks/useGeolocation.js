import { useState, useCallback } from 'react';

/**
 * Hook to manage device geolocation with explicit user permission and status handling.
 *
 * Requirements:
 *  - Informative: explains why location is needed before prompting
 *  - Handles: granted, denied, unavailable, timeout, unsupported browser
 *  - Safe: single-shot (no continuous drain), falls back cleanly
 */
export function useGeolocation() {
  const [state, setState] = useState({
    status: 'idle', // 'idle' | 'requesting' | 'success' | 'error'
    coords: null,   // { latitude, longitude }
    error: null,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState({
        status: 'error',
        coords: null,
        error: 'Geolocation is not supported by your browser or device.',
      });
      return;
    }

    setState((prev) => ({ ...prev, status: 'requesting', error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setState({
          status: 'success',
          coords,
          error: null,
        });
      },
      (err) => {
        let msg = 'Failed to obtain live location.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'Location permission was denied. Falling back to registered address.';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = 'Current location is unavailable. Check your network or device GPS.';
            break;
          case err.TIMEOUT:
            msg = 'Location request timed out. Please retry or use your registered address.';
            break;
          default:
            msg = err.message || msg;
        }
        setState({
          status: 'error',
          coords: null,
          error: msg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', coords: null, error: null });
  }, []);

  return {
    ...state,
    requestLocation,
    reset,
    isIdle: state.status === 'idle',
    isRequesting: state.status === 'requesting',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
  };
}