import React, { useEffect } from 'react';
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
    isMobile,
    messages,
    open,
    close,
    dismissProactive,
    sendMessage,
    updateConversation,
  } = useAssistantWidget(section);

  // Get external trigger from context
  const { pendingFlow, clearPendingFlow } = useAssistantContext();

  // Handle external flow trigger
  useEffect(() => {
    if (pendingFlow && !loading && isEnabled && !isOpen) {
      open();
      // Clear the pending flow after opening
      clearPendingFlow();
    }
  }, [pendingFlow, loading, isEnabled, isOpen, open, clearPendingFlow]);

  // Don't render if loading or not enabled
  if (loading || !isEnabled) {
    return null;
  }

  return (
    <>
      {/* Bubble / Mini-card trigger */}
      <AssistantBubble
        isOpen={isOpen}
        showProactive={showProactive}
        isMobile={isMobile}
        welcomeMessage={settings?.welcome_message}
        onOpen={open}
        onDismissProactive={dismissProactive}
      />

      {/* Chat panel */}
      <AssistantChat
        isOpen={isOpen}
        section={section}
        initialFlow={pendingFlow?.flowId}
        initialPrefill={pendingFlow?.prefillText}
        onClose={close}
        onSendMessage={sendMessage}
        onUpdateConversation={updateConversation}
        isMobile={isMobile}
        persistedMessages={messages}
      />
    </>
  );
};

export default AssistantWidget;
