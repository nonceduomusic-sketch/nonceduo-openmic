import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AssistantContextType {
  // External trigger for opening assistant with specific flow
  pendingFlow: { flowId: string; prefillText?: string } | null;
  triggerFlow: (flowId: string, prefillText?: string) => void;
  clearPendingFlow: () => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const AssistantContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pendingFlow, setPendingFlow] = useState<{ flowId: string; prefillText?: string } | null>(null);

  const triggerFlow = useCallback((flowId: string, prefillText?: string) => {
    setPendingFlow({ flowId, prefillText });
  }, []);

  const clearPendingFlow = useCallback(() => {
    setPendingFlow(null);
  }, []);

  return (
    <AssistantContext.Provider value={{ pendingFlow, triggerFlow, clearPendingFlow }}>
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistantContext = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistantContext must be used within AssistantContextProvider');
  }
  return context;
};
