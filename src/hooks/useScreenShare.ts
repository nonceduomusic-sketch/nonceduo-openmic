import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { ScreenCapture } from '@/plugins/screen-capture';

interface ScreenShareState {
  isSharing: boolean;
  isConnecting: boolean;
  countdown: number | null;
  error: string | null;
  isNativeAvailable: boolean;
}

interface UseScreenShareOptions {
  salaCode: string;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useScreenShareBroadcaster({ salaCode, onStreamStart, onStreamEnd }: UseScreenShareOptions) {
  const [state, setState] = useState<ScreenShareState>({
    isSharing: false,
    isConnecting: false,
    countdown: null,
    error: null,
    isNativeAvailable: false,
  });
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if native screen capture is available
  useEffect(() => {
    const checkNativeAvailability = async () => {
      try {
        const result = await ScreenCapture.isAvailable();
        setState(prev => ({ ...prev, isNativeAvailable: result.available }));
        console.log('Screen capture availability:', result);
      } catch (e) {
        console.log('Screen capture plugin not available:', e);
      }
    };
    checkNativeAvailability();
  }, []);

  // Cleanup function
  const cleanup = useCallback(async (reason: string = 'user_stopped') => {
    // Stop countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Stop native capture if running
    try {
      await ScreenCapture.stopCapture();
    } catch (e) {
      // Plugin might not be available
    }

    // Update database state
    await supabase
      .from('broadcast_sessions')
      .update({
        screen_share_active: false,
        screen_share_offer: null,
        screen_share_answer: null,
        screen_share_ice_candidates: [],
        screen_share_stopped_reason: reason,
      } as any)
      .eq('sala_code', salaCode);

    setState(prev => ({
      ...prev,
      isSharing: false,
      isConnecting: false,
      countdown: null,
    }));

    onStreamEnd?.();
  }, [salaCode, onStreamEnd]);

  // Start screen share with countdown
  const startScreenShare = useCallback(async (countdownSeconds: number = 3) => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));

      // Check if we're on a native platform (Capacitor)
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        // Use native plugin for Android/iOS
        console.log('Using native screen capture plugin');
        const result = await ScreenCapture.startCapture();
        if (!result.success) {
          throw new Error(result.message || 'Native screen capture failed');
        }
        // Note: Native plugin handles the actual capture - we just signal it's active
        // For WebRTC streaming, we'd need additional native code to pipe frames
        // For now, we just mark it as active in DB for the TV to show a placeholder
        
        // Update database state to indicate native capture is active
        await supabase
          .from('broadcast_sessions')
          .update({
            screen_share_active: true,
            screen_share_started_at: new Date().toISOString(),
            screen_share_stopped_reason: null,
          } as any)
          .eq('sala_code', salaCode);

        setState(prev => ({
          ...prev,
          isSharing: true,
          isConnecting: false,
          countdown: null,
        }));

        onStreamStart?.();
        toast.success('Screen share nativo avviato!');
        return;
      }

      // Web fallback - check platform compatibility
      const ua = navigator.userAgent || '';
      const isAndroid = /Android/i.test(ua);
      const isIOS = /iPhone|iPad|iPod/i.test(ua);

      if (isAndroid || isIOS) {
        throw new Error(
          'Screen sharing via browser non supportato su Android/iOS. ' +
          'Usa l\'app nativa NonceDuo per questa funzione.'
        );
      }

      // Check if running inside iframe (editor preview)
      if (window.self !== window.top) {
        throw new Error(
          'Screen share non può partire dentro l\'anteprima editor. ' +
          'Apri /admin in una nuova scheda e riprova.'
        );
      }

      // Check if Screen Capture API is available
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen sharing non supportato su questo browser');
      }

      // Request screen capture immediately (before countdown)
      const capturedStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      mediaStreamRef.current = capturedStream;

      // Handle user stopping share via browser controls
      capturedStream.getVideoTracks()[0].onended = () => {
        cleanup('user_cancelled');
        toast.info('Screen share terminato');
      };

      // Start countdown
      setState(prev => ({ ...prev, countdown: countdownSeconds }));
      
      await new Promise<void>((resolve) => {
        let remaining = countdownSeconds;
        countdownIntervalRef.current = setInterval(() => {
          remaining--;
          setState(prev => ({ ...prev, countdown: remaining }));
          if (remaining <= 0) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            resolve();
          }
        }, 1000);
      });

      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnectionRef.current = pc;

      // Add tracks
      capturedStream.getTracks().forEach(track => {
        pc.addTrack(track, capturedStream);
      });

      // Collect ICE candidates
      const iceCandidates: RTCIceCandidateInit[] = [];
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          iceCandidates.push(event.candidate.toJSON());
          // Update candidates in database
          await supabase
            .from('broadcast_sessions')
            .update({ screen_share_ice_candidates: iceCandidates } as any)
            .eq('sala_code', salaCode);
        }
      };

      // Create and set offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Update database with offer and active state
      await supabase
        .from('broadcast_sessions')
        .update({
          screen_share_active: true,
          screen_share_offer: offer,
          screen_share_answer: null,
          screen_share_ice_candidates: [],
          screen_share_started_at: new Date().toISOString(),
          screen_share_stopped_reason: null,
        } as any)
        .eq('sala_code', salaCode);

      // Listen for answer from viewer
      const channel = supabase
        .channel(`screen-share-answer-${salaCode}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'broadcast_sessions',
            filter: `sala_code=eq.${salaCode}`,
          },
          async (payload) => {
            const answer = (payload.new as any).screen_share_answer;
            if (answer && pc.signalingState === 'have-local-offer') {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
              } catch (err) {
                console.error('Error setting remote description:', err);
              }
            }
          }
        )
        .subscribe();

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          cleanup('connection_lost');
          toast.error('Connessione persa');
        }
      };

      setState(prev => ({
        ...prev,
        isSharing: true,
        isConnecting: false,
        countdown: null,
      }));

      onStreamStart?.();
      toast.success('Screen share avviato!');

      // Cleanup channel on stop
      return () => {
        supabase.removeChannel(channel);
      };

    } catch (error: any) {
      console.error('Screen share error:', error);
      
      // Cleanup any partial state
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      const errorMessage = error.name === 'NotAllowedError' 
        ? 'Permesso negato per la condivisione schermo'
        : error.message || 'Errore durante lo screen share';
      
      setState(prev => ({
        ...prev,
        isSharing: false,
        isConnecting: false,
        countdown: null,
        error: errorMessage,
      }));

      if (error.name !== 'NotAllowedError') {
        toast.error(errorMessage);
      }
    }
  }, [salaCode, cleanup, onStreamStart]);

  // Stop screen share
  const stopScreenShare = useCallback(() => {
    cleanup('user_stopped');
    toast.info('Screen share interrotto');
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup('component_unmount');
    };
  }, [cleanup]);

  return {
    ...state,
    startScreenShare,
    stopScreenShare,
  };
}

// Hook for viewing screen share on /trasmetti
export function useScreenShareViewer({ salaCode }: { salaCode: string }) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    setIsConnecting(false);
    setIsActive(false);
  }, []);

  useEffect(() => {
    // Subscribe to screen share updates
    const channel = supabase
      .channel(`screen-share-viewer-${salaCode}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'broadcast_sessions',
          filter: `sala_code=eq.${salaCode}`,
        },
        async (payload) => {
          const session = payload.new as any;
          
          if (!session.screen_share_active) {
            cleanup();
            return;
          }

          setIsActive(true);

          // If we have an offer and no peer connection, create one
          if (session.screen_share_offer && !peerConnectionRef.current) {
            setIsConnecting(true);

            try {
              const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
              peerConnectionRef.current = pc;

              // Handle remote stream
              pc.ontrack = (event) => {
                console.log('Received remote track:', event.track.kind);
                setRemoteStream(event.streams[0]);
                setIsConnecting(false);
              };

              // Handle ICE candidates from broadcaster
              const addIceCandidates = async (candidates: RTCIceCandidateInit[]) => {
                for (const candidate of candidates) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                  } catch (err) {
                    console.error('Error adding ICE candidate:', err);
                  }
                }
              };

              // Set remote description (offer)
              await pc.setRemoteDescription(new RTCSessionDescription(session.screen_share_offer));

              // Create and set answer
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              // Send answer back to broadcaster
              await supabase
                .from('broadcast_sessions')
                .update({ screen_share_answer: answer } as any)
                .eq('sala_code', salaCode);

              // Add any existing ICE candidates
              if (session.screen_share_ice_candidates?.length) {
                await addIceCandidates(session.screen_share_ice_candidates);
              }

              // Handle connection state
              pc.onconnectionstatechange = () => {
                console.log('Viewer connection state:', pc.connectionState);
                if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                  cleanup();
                }
              };

            } catch (err) {
              console.error('Error setting up viewer connection:', err);
              cleanup();
            }
          }

          // Handle new ICE candidates
          if (session.screen_share_ice_candidates?.length && peerConnectionRef.current) {
            for (const candidate of session.screen_share_ice_candidates) {
              try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err) {
                // Candidate might already be added
              }
            }
          }
        }
      )
      .subscribe();

    // Initial fetch to check current state
    const fetchInitialState = async () => {
      const { data } = await supabase
        .from('broadcast_sessions')
        .select('screen_share_active, screen_share_offer, screen_share_ice_candidates')
        .eq('sala_code', salaCode)
        .single();

      if (data && (data as any).screen_share_active && (data as any).screen_share_offer) {
        // Trigger the handler manually with current state
        channel.send({
          type: 'broadcast',
          event: 'initial_state',
          payload: data,
        });
      }
    };

    fetchInitialState();

    return () => {
      supabase.removeChannel(channel);
      cleanup();
    };
  }, [salaCode, cleanup]);

  return {
    remoteStream,
    isConnecting,
    isActive,
  };
}
