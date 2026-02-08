import React, { useEffect, useState } from 'react';
import { useAssistantWidget } from '@/hooks/useAssistantWidget';
import { useAssistantContext } from '@/contexts/AssistantContext';
import { AssistantBubble } from './AssistantBubble';
import { AssistantChat } from './AssistantChat';

interface AssistantWidgetProps {
  section?: 'site' | 'openmic' | 'dediche' | 'community';
}

export const AssistantWidget: React.FC<AssistantWidgetProps> = ({ 
  section = 'site' 
}) => {
  const {
    settings,
    loading,
    isEnabled,
    isOpen,
    showProactive,
    showWelcomeMessage,
    isMobile,
    messages,
    open,
    close,
    dismissProactive,
    sendMessage,
    updateConversation,
  } = useAssistantWidget(section);

  // Minimized state - chat is "closed" but bubble is tiny & draggable
  const [isMinimized, setIsMinimized] = useState(false);

  // Get external trigger from context
  const { pendingFlow, clearPendingFlow } = useAssistantContext();

  // Handle external flow trigger
  useEffect(() => {
    if (pendingFlow && !loading && isEnabled && !isOpen) {
      setIsMinimized(false);
      open();
      // Clear the pending flow after opening
      clearPendingFlow();
    }
  }, [pendingFlow, loading, isEnabled, isOpen, open, clearPendingFlow]);

  const handleOpen = () => {
    setIsMinimized(false);
    open();
  };

  const handleMinimize = () => {
    close();
    setIsMinimized(true);
  };

  const handleClose = () => {
    close();
    setIsMinimized(false);
  };

  // Don't render if loading or not enabled
  if (loading || !isEnabled) {
    return null;
  }

  return (
    <>
      {/* Bubble / Mini-card trigger */}
      <AssistantBubble
        isOpen={isOpen}
        showProactive={showProactive && showWelcomeMessage}
        isMobile={isMobile}
        welcomeMessage={showWelcomeMessage ? settings?.welcome_message : undefined}
        onOpen={handleOpen}
        onDismissProactive={dismissProactive}
        isMinimized={isMinimized}
        onMinimize={handleMinimize}
      />

      {/* Chat panel */}
      <AssistantChat
        isOpen={isOpen}
        section={section}
        initialFlow={pendingFlow?.flowId}
        initialPrefill={pendingFlow?.prefillText}
        onClose={handleClose}
        onMinimize={handleMinimize}
        onSendMessage={sendMessage}
        onUpdateConversation={updateConversation}
        isMobile={isMobile}
        persistedMessages={messages}
      />
    </>
  );
};

export default AssistantWidget;
