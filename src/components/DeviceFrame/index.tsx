"use client";

import { useEffect, useState } from "react";

/** Physical resolution of the target touchscreen (Raspberry/Orange Pi 7"). */
export const DEVICE_WIDTH = 1024;
export const DEVICE_HEIGHT = 600;

/**
 * Locks the app to the device's 1024×600 frame and scales it to fit the current
 * window (preserving aspect ratio). On the real device the scale is 1:1 (pixel
 * accurate); on a laptop the same frame is scaled to fit, letterboxed by the
 * dark area around it.
 */
export default function DeviceFrame({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / DEVICE_WIDTH, window.innerHeight / DEVICE_HEIGHT));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div className='grid h-screen w-screen place-items-center overflow-hidden bg-neutral-950'>
      <div
        className='bg-app relative shrink-0 overflow-hidden shadow-2xl'
        style={{ width: DEVICE_WIDTH, height: DEVICE_HEIGHT, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
