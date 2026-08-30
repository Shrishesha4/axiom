"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from "react";

type ShellMainHeaderContextValue = {
  setHeader: Dispatch<SetStateAction<ReactNode>>;
};

export const ShellMainHeaderContext = createContext<ShellMainHeaderContextValue | null>(null);

type ShellMainHeaderProviderProps = {
  children: (header: ReactNode) => ReactElement;
};

export function ShellMainHeaderProvider({ children }: ShellMainHeaderProviderProps) {
  const [header, setHeader] = useState<ReactNode>(null);
  const contextValue = useMemo(() => ({ setHeader }), []);

  return (
    <ShellMainHeaderContext.Provider value={contextValue}>
      {children(header)}
    </ShellMainHeaderContext.Provider>
  );
}

export function useShellMainHeader(text: string | null | undefined) {
  const context = useContext(ShellMainHeaderContext);

  useEffect(() => {
    if (!context) return;

    context.setHeader(
      text ? (
        <p className="truncate text-sm text-muted-foreground">{text}</p>
      ) : null,
    );

    return () => context.setHeader(null);
  }, [context, text]);
}
