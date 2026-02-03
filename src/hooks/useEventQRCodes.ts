import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EventQRCode {
  id: string;
  name: string;
  pin_code: string;
  event_id: string;
  event_type: 'freemode' | 'scheduled';
  is_active: boolean;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateQRCodeParams {
  name: string;
  pin_code?: string; // Se non fornito, verrà generato
  event_id: string;
  event_type: 'freemode' | 'scheduled';
}

/**
 * Hook per gestire i QR Code multipli associati agli eventi
 */
export function useEventQRCodes(eventId?: string, eventType?: 'freemode' | 'scheduled') {
  const [qrCodes, setQRCodes] = useState<EventQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch QR codes per un evento specifico o tutti
  const fetchQRCodes = useCallback(async () => {
    try {
      let query = supabase
        .from('event_qr_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setQRCodes((data as EventQRCode[]) || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento QR codes');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchQRCodes();
  }, [fetchQRCodes]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`event-qr-codes-${eventId || 'all'}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_qr_codes',
        },
        () => {
          fetchQRCodes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchQRCodes, eventId]);

  // Genera un PIN casuale (4-6 caratteri alfanumerici)
  const generatePIN = useCallback((): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Escludo caratteri confondibili (0,O,1,I)
    let pin = '';
    for (let i = 0; i < 6; i++) {
      pin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pin;
  }, []);

  // Crea un nuovo QR code
  const createQRCode = useCallback(async (params: CreateQRCodeParams): Promise<string | null> => {
    try {
      const pin = params.pin_code || generatePIN();

      const { data, error: insertError } = await supabase
        .from('event_qr_codes')
        .insert({
          name: params.name,
          pin_code: pin.toUpperCase().trim(),
          event_id: params.event_id,
          event_type: params.event_type,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      await fetchQRCodes();
      return data?.id || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella creazione QR code');
      return null;
    }
  }, [fetchQRCodes, generatePIN]);

  // Aggiorna un QR code (nome o PIN)
  const updateQRCode = useCallback(async (
    qrId: string, 
    updates: { name?: string; pin_code?: string; is_active?: boolean }
  ): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.pin_code !== undefined) updateData.pin_code = updates.pin_code.toUpperCase().trim();
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

      const { error: updateError } = await supabase
        .from('event_qr_codes')
        .update(updateData)
        .eq('id', qrId);

      if (updateError) throw updateError;

      await fetchQRCodes();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiornamento QR code');
      return false;
    }
  }, [fetchQRCodes]);

  // Rigenera il PIN di un QR code
  const regeneratePIN = useCallback(async (qrId: string): Promise<string | null> => {
    const newPin = generatePIN();
    const success = await updateQRCode(qrId, { pin_code: newPin });
    return success ? newPin : null;
  }, [generatePIN, updateQRCode]);

  // Elimina un QR code
  const deleteQRCode = useCallback(async (qrId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('event_qr_codes')
        .delete()
        .eq('id', qrId);

      if (deleteError) throw deleteError;

      await fetchQRCodes();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nell\'eliminazione QR code');
      return false;
    }
  }, [fetchQRCodes]);

  // Toggle attivo/disattivo
  const toggleActive = useCallback(async (qrId: string, active: boolean): Promise<boolean> => {
    return updateQRCode(qrId, { is_active: active });
  }, [updateQRCode]);

  return {
    qrCodes,
    loading,
    error,
    generatePIN,
    createQRCode,
    updateQRCode,
    regeneratePIN,
    deleteQRCode,
    toggleActive,
    refetch: fetchQRCodes,
  };
}

/**
 * Hook per validare un PIN QR code
 */
export function useValidateQRPin() {
  const [validating, setValidating] = useState(false);

  const validatePin = useCallback(async (pin: string): Promise<{
    isValid: boolean;
    eventId?: string;
    eventType?: string;
    qrName?: string;
    eventName?: string;
    isLive?: boolean;
  }> => {
    setValidating(true);
    try {
      const { data, error } = await supabase.rpc('validate_event_qr_pin', {
        p_pin: pin.toUpperCase().trim(),
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      
      return {
        isValid: result?.is_valid ?? false,
        eventId: result?.event_id,
        eventType: result?.event_type,
        qrName: result?.qr_name,
        eventName: result?.event_name,
        isLive: result?.is_live ?? false,
      };
    } catch (err) {
      console.error('[ValidateQRPin] Error:', err);
      return { isValid: false };
    } finally {
      setValidating(false);
    }
  }, []);

  return { validatePin, validating };
}
