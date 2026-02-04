import React from 'react';
import { useAssistantWidget } from '@/hooks/useAssistantWidget';
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
    open,
    close,
    dismissProactive,
    sendMessage,
    updateConversation,
  } = useAssistantWidget(section);

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
        onClose={close}
        onSendMessage={sendMessage}
        onUpdateConversation={updateConversation}
        isMobile={isMobile}
      />
    </>
  );
};

export default AssistantWidget;
