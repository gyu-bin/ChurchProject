import React, { createContext, useContext, useRef } from 'react';

const ScrollCallbackContext = createContext({
  setScrollCallback: (key: string, cb: () => void) => {},
  runScrollCallback: (key: string) => {},
});

export const ScrollCallbackProvider = ({ children }: { children: React.ReactNode }) => {
  const callbacks = useRef<{ [key: string]: () => void }>({});

  const setScrollCallback = (key: string, cb: () => void) => {
    callbacks.current[key] = cb;
  };
  const runScrollCallback = (key: string) => {
    if (callbacks.current[key]) callbacks.current[key]();
  };

  return (
    <ScrollCallbackContext.Provider value={{ setScrollCallback, runScrollCallback }}>
      {children}
    </ScrollCallbackContext.Provider>
  );
};

export const useScrollCallback = () => useContext(ScrollCallbackContext); 