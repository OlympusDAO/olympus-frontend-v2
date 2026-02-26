import { createContext, useContext, useState, ReactNode } from "react";

interface ToSContextType {
  hasAcceptedToS: boolean;
  acceptToS: () => void;
  version: string;
}

const ToSContext = createContext<ToSContextType | undefined>(undefined);

const TOS_STORAGE_KEY = "olympus-cds-tos-accepted";
const TOS_VERSION = "v1";

export function ToSProvider({ children }: { children: ReactNode }) {
  const [hasAcceptedToS, setHasAcceptedToS] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(TOS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.version === TOS_VERSION && parsed.accepted === true;
      }
    } catch (error) {
      console.error("Error reading ToS acceptance from localStorage:", error);
    }
    return false;
  });

  const acceptToS = () => {
    try {
      const data = {
        accepted: true,
        version: TOS_VERSION,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(TOS_STORAGE_KEY, JSON.stringify(data));
      setHasAcceptedToS(true);
    } catch (error) {
      console.error("Error saving ToS acceptance to localStorage:", error);
    }
  };

  return (
    <ToSContext.Provider value={{ hasAcceptedToS, acceptToS, version: TOS_VERSION }}>
      {children}
    </ToSContext.Provider>
  );
}

export function useToS() {
  const context = useContext(ToSContext);
  if (context === undefined) {
    throw new Error("useToS must be used within a ToSProvider");
  }
  return context;
}
