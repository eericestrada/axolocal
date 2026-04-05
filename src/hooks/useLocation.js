'use client';

import { useState, useEffect, useCallback } from 'react';

export function useLocation() {
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });

  const update = useCallback((position) => {
    setLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      error: null,
      loading: false,
    });
  }, []);

  const handleError = useCallback((err) => {
    setLocation((prev) => ({
      ...prev,
      error: err.message,
      loading: false,
    }));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        error: 'Geolocation not supported',
        loading: false,
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(update, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    const watchId = navigator.geolocation.watchPosition(update, handleError, {
      enableHighAccuracy: false,
      timeout: 30000,
      maximumAge: 60000,
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [update, handleError]);

  const refresh = useCallback(() => {
    setLocation((prev) => ({ ...prev, loading: true }));
    navigator.geolocation.getCurrentPosition(update, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
    });
  }, [update, handleError]);

  return { ...location, refresh };
}
