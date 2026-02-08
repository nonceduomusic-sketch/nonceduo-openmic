export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_role: Database["public"]["Enums"]["app_role"] | null
          actor_user_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json
          section: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          actor_user_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          section?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          actor_user_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          section?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
      assistant_conversations: {
        Row: {
          created_at: string | null
          flow_path: string[] | null
          id: string
          lead_score: number | null
          lead_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          session_id: string | null
          source_section: string
          source_url: string | null
          status: string
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          flow_path?: string[] | null
          id?: string
          lead_score?: number | null
          lead_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          source_section?: string
          source_url?: string | null
          status?: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          flow_path?: string[] | null
          id?: string
          lead_score?: number | null
          lead_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          source_section?: string
          source_url?: string | null
          status?: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          conversation_id: string
          created_at: string | null
          delivery_status: string | null
          edited_at: string | null
          id: string
          is_read: boolean | null
          message_text: string
          message_type: string
          metadata: Json | null
          read_at: string | null
          sender_name: string | null
          sender_type: string
          sender_user_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          delivery_status?: string | null
          edited_at?: string | null
          id?: string
          is_read?: boolean | null
          message_text: string
          message_type?: string
          metadata?: Json | null
          read_at?: string | null
          sender_name?: string | null
          sender_type: string
          sender_user_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          delivery_status?: string | null
          edited_at?: string | null
          id?: string
          is_read?: boolean | null
          message_text?: string
          message_type?: string
          metadata?: Json | null
          read_at?: string | null
          sender_name?: string | null
          sender_type?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_settings: {
        Row: {
          enabled_on_community: boolean
          enabled_on_dediche: boolean
          enabled_on_openmic: boolean
          enabled_on_site: boolean
          id: string
          is_enabled: boolean
          notify_community: boolean | null
          notify_dediche: boolean | null
          notify_openmic: boolean | null
          notify_site: boolean | null
          proactive_delay_seconds: number
          telegram_chat_id: string | null
          telegram_enabled: boolean | null
          updated_at: string | null
          updated_by: string | null
          welcome_message: string
        }
        Insert: {
          enabled_on_community?: boolean
          enabled_on_dediche?: boolean
          enabled_on_openmic?: boolean
          enabled_on_site?: boolean
          id?: string
          is_enabled?: boolean
          notify_community?: boolean | null
          notify_dediche?: boolean | null
          notify_openmic?: boolean | null
          notify_site?: boolean | null
          proactive_delay_seconds?: number
          telegram_chat_id?: string | null
          telegram_enabled?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          welcome_message?: string
        }
        Update: {
          enabled_on_community?: boolean
          enabled_on_dediche?: boolean
          enabled_on_openmic?: boolean
          enabled_on_site?: boolean
          id?: string
          is_enabled?: boolean
          notify_community?: boolean | null
          notify_dediche?: boolean | null
          notify_openmic?: boolean | null
          notify_site?: boolean | null
          proactive_delay_seconds?: number
          telegram_chat_id?: string | null
          telegram_enabled?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          welcome_message?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          expires_at: string | null
          id: string
          reason: string | null
          session_id: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          reason?: string | null
          session_id: string
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          reason?: string | null
          session_id?: string
        }
        Relationships: []
      }
      broadcast_remote_access: {
        Row: {
          access_token: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          pin_code: string
          sala_code: string
          updated_at: string
        }
        Insert: {
          access_token?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          pin_code?: string
          sala_code?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          pin_code?: string
          sala_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      broadcast_remote_sessions: {
        Row: {
          access_id: string
          connected_at: string
          device_fingerprint: string | null
          device_name: string | null
          id: string
          is_active: boolean
          last_activity_at: string
        }
        Insert: {
          access_id: string
          connected_at?: string
          device_fingerprint?: string | null
          device_name?: string | null
          id?: string
          is_active?: boolean
          last_activity_at?: string
        }
        Update: {
          access_id?: string
          connected_at?: string
          device_fingerprint?: string | null
          device_name?: string | null
          id?: string
          is_active?: boolean
          last_activity_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_remote_sessions_access_id_fkey"
            columns: ["access_id"]
            isOneToOne: false
            referencedRelation: "broadcast_remote_access"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_sessions: {
        Row: {
          auto_scroll: boolean | null
          created_at: string | null
          current_reservation_id: string | null
          current_song_id: string | null
          display_mode: string
          font_size: number | null
          highlight_enabled: boolean | null
          highlight_line: number | null
          id: string
          is_active: boolean
          is_broadcasting: boolean | null
          remote_scroll_enabled: boolean | null
          sala_code: string
          sala_name: string
          scroll_position: number | null
          scroll_speed: number | null
          text_align: string | null
          tv_element_positions: Json | null
          tv_footer: string | null
          tv_logo_url: string | null
          tv_qr_cta: string | null
          tv_qr_url: string | null
          tv_show_footer: boolean | null
          tv_show_logo: boolean | null
          tv_show_qr: boolean | null
          tv_show_status: boolean | null
          tv_show_subtitle: boolean | null
          tv_show_title: boolean | null
          tv_subtitle: string | null
          tv_title: string | null
          tv_view_mode: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auto_scroll?: boolean | null
          created_at?: string | null
          current_reservation_id?: string | null
          current_song_id?: string | null
          display_mode?: string
          font_size?: number | null
          highlight_enabled?: boolean | null
          highlight_line?: number | null
          id?: string
          is_active?: boolean
          is_broadcasting?: boolean | null
          remote_scroll_enabled?: boolean | null
          sala_code?: string
          sala_name?: string
          scroll_position?: number | null
          scroll_speed?: number | null
          text_align?: string | null
          tv_element_positions?: Json | null
          tv_footer?: string | null
          tv_logo_url?: string | null
          tv_qr_cta?: string | null
          tv_qr_url?: string | null
          tv_show_footer?: boolean | null
          tv_show_logo?: boolean | null
          tv_show_qr?: boolean | null
          tv_show_status?: boolean | null
          tv_show_subtitle?: boolean | null
          tv_show_title?: boolean | null
          tv_subtitle?: string | null
          tv_title?: string | null
          tv_view_mode?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auto_scroll?: boolean | null
          created_at?: string | null
          current_reservation_id?: string | null
          current_song_id?: string | null
          display_mode?: string
          font_size?: number | null
          highlight_enabled?: boolean | null
          highlight_line?: number | null
          id?: string
          is_active?: boolean
          is_broadcasting?: boolean | null
          remote_scroll_enabled?: boolean | null
          sala_code?: string
          sala_name?: string
          scroll_position?: number | null
          scroll_speed?: number | null
          text_align?: string | null
          tv_element_positions?: Json | null
          tv_footer?: string | null
          tv_logo_url?: string | null
          tv_qr_cta?: string | null
          tv_qr_url?: string | null
          tv_show_footer?: boolean | null
          tv_show_logo?: boolean | null
          tv_show_qr?: boolean | null
          tv_show_status?: boolean | null
          tv_show_subtitle?: boolean | null
          tv_show_title?: boolean | null
          tv_subtitle?: string | null
          tv_title?: string | null
          tv_view_mode?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_sessions_current_reservation_id_fkey"
            columns: ["current_reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_sessions_current_song_id_fkey"
            columns: ["current_song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_setlist_songs: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          position: number
          setlist_id: string
          song_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          position?: number
          setlist_id: string
          song_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          position?: number
          setlist_id?: string
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_setlist_songs_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "broadcast_setlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_setlist_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_setlists: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_invite_links: {
        Row: {
          conversation_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          invite_code: string
          is_active: boolean
          max_uses: number | null
          requires_approval: boolean
          use_count: number
        }
        Insert: {
          conversation_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          invite_code: string
          is_active?: boolean
          max_uses?: number | null
          requires_approval?: boolean
          use_count?: number
        }
        Update: {
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          is_active?: boolean
          max_uses?: number | null
          requires_approval?: boolean
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "chat_invite_links_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          edited_at: string | null
          id: string
          message_text: string
          read_at: string | null
          sender_name: string
          sender_session_id: string | null
          sender_type: string
          sender_user_id: string | null
          status: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          message_text: string
          read_at?: string | null
          sender_name: string
          sender_session_id?: string | null
          sender_type: string
          sender_user_id?: string | null
          status?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          message_text?: string
          read_at?: string | null
          sender_name?: string
          sender_session_id?: string | null
          sender_type?: string
          sender_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      community_blocked_users: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          expires_at: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          participant_name: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          participant_name: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          participant_name?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          allowed_participants: string[] | null
          category: string | null
          created_at: string
          created_by_user_id: string | null
          id: string
          is_group: boolean
          is_public: boolean | null
          is_read: boolean | null
          is_registered_only: boolean | null
          name: string | null
          password_hash: string | null
          password_hint: string | null
          requires_approval: boolean | null
          section: string | null
          slug: string | null
          updated_at: string
          visibility: string | null
        }
        Insert: {
          allowed_participants?: string[] | null
          category?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_group?: boolean
          is_public?: boolean | null
          is_read?: boolean | null
          is_registered_only?: boolean | null
          name?: string | null
          password_hash?: string | null
          password_hint?: string | null
          requires_approval?: boolean | null
          section?: string | null
          slug?: string | null
          updated_at?: string
          visibility?: string | null
        }
        Update: {
          allowed_participants?: string[] | null
          category?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_group?: boolean
          is_public?: boolean | null
          is_read?: boolean | null
          is_registered_only?: boolean | null
          name?: string | null
          password_hash?: string | null
          password_hint?: string | null
          requires_approval?: boolean | null
          section?: string | null
          slug?: string | null
          updated_at?: string
          visibility?: string | null
        }
        Relationships: []
      }
      event_booking_rules: {
        Row: {
          booking_closes_at: string | null
          booking_opens_at: string | null
          catalog_preview_enabled: boolean | null
          catalog_preview_limit_type: string | null
          catalog_preview_limit_value: number | null
          catalog_preview_message: string | null
          close_minutes_before_end: number | null
          closure_message: string | null
          closure_mode: string | null
          closure_preview_enabled: boolean | null
          closure_redirect_url: string | null
          closure_title: string | null
          countdown_end_show_minutes: number | null
          countdown_start_show_minutes: number | null
          created_at: string | null
          created_by: string | null
          dediche_current_count: number | null
          dediche_enabled: boolean | null
          dediche_final_limit_enabled: boolean | null
          dediche_final_limit_minutes: number | null
          dediche_final_limit_total: number | null
          dediche_max_total: number | null
          event_date: string | null
          event_end_time: string | null
          event_name: string | null
          event_start_time: string | null
          event_status: string | null
          event_type: string | null
          id: string
          is_active: boolean | null
          is_consultable_mode: boolean | null
          openmic_current_count: number | null
          openmic_enabled: boolean | null
          openmic_final_limit_enabled: boolean | null
          openmic_final_limit_minutes: number | null
          openmic_final_limit_songs: number | null
          openmic_max_songs: number | null
          pin_code: string | null
          pin_required: boolean | null
          protect_repertoire: boolean | null
          reopen_active: boolean | null
          reopen_dediche_used: number | null
          reopen_extra_dediche: number | null
          reopen_extra_songs: number | null
          reopen_message: string | null
          reopen_mode: string | null
          reopen_songs_used: number | null
          reopen_until: string | null
          updated_at: string | null
          user_limit_consecutive_enabled: boolean | null
          user_limit_consecutive_songs: number | null
          user_limit_cooldown_message: string | null
          user_limit_dediche_total: number | null
          user_limit_enabled: boolean | null
          user_limit_interval_enabled: boolean | null
          user_limit_interval_minutes: number | null
          user_limit_mode: string | null
          user_limit_songs_interval: number | null
          user_limit_songs_total: number | null
          user_limit_total_enabled: boolean | null
          voting_enabled: boolean | null
        }
        Insert: {
          booking_closes_at?: string | null
          booking_opens_at?: string | null
          catalog_preview_enabled?: boolean | null
          catalog_preview_limit_type?: string | null
          catalog_preview_limit_value?: number | null
          catalog_preview_message?: string | null
          close_minutes_before_end?: number | null
          closure_message?: string | null
          closure_mode?: string | null
          closure_preview_enabled?: boolean | null
          closure_redirect_url?: string | null
          closure_title?: string | null
          countdown_end_show_minutes?: number | null
          countdown_start_show_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          dediche_current_count?: number | null
          dediche_enabled?: boolean | null
          dediche_final_limit_enabled?: boolean | null
          dediche_final_limit_minutes?: number | null
          dediche_final_limit_total?: number | null
          dediche_max_total?: number | null
          event_date?: string | null
          event_end_time?: string | null
          event_name?: string | null
          event_start_time?: string | null
          event_status?: string | null
          event_type?: string | null
          id?: string
          is_active?: boolean | null
          is_consultable_mode?: boolean | null
          openmic_current_count?: number | null
          openmic_enabled?: boolean | null
          openmic_final_limit_enabled?: boolean | null
          openmic_final_limit_minutes?: number | null
          openmic_final_limit_songs?: number | null
          openmic_max_songs?: number | null
          pin_code?: string | null
          pin_required?: boolean | null
          protect_repertoire?: boolean | null
          reopen_active?: boolean | null
          reopen_dediche_used?: number | null
          reopen_extra_dediche?: number | null
          reopen_extra_songs?: number | null
          reopen_message?: string | null
          reopen_mode?: string | null
          reopen_songs_used?: number | null
          reopen_until?: string | null
          updated_at?: string | null
          user_limit_consecutive_enabled?: boolean | null
          user_limit_consecutive_songs?: number | null
          user_limit_cooldown_message?: string | null
          user_limit_dediche_total?: number | null
          user_limit_enabled?: boolean | null
          user_limit_interval_enabled?: boolean | null
          user_limit_interval_minutes?: number | null
          user_limit_mode?: string | null
          user_limit_songs_interval?: number | null
          user_limit_songs_total?: number | null
          user_limit_total_enabled?: boolean | null
          voting_enabled?: boolean | null
        }
        Update: {
          booking_closes_at?: string | null
          booking_opens_at?: string | null
          catalog_preview_enabled?: boolean | null
          catalog_preview_limit_type?: string | null
          catalog_preview_limit_value?: number | null
          catalog_preview_message?: string | null
          close_minutes_before_end?: number | null
          closure_message?: string | null
          closure_mode?: string | null
          closure_preview_enabled?: boolean | null
          closure_redirect_url?: string | null
          closure_title?: string | null
          countdown_end_show_minutes?: number | null
          countdown_start_show_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          dediche_current_count?: number | null
          dediche_enabled?: boolean | null
          dediche_final_limit_enabled?: boolean | null
          dediche_final_limit_minutes?: number | null
          dediche_final_limit_total?: number | null
          dediche_max_total?: number | null
          event_date?: string | null
          event_end_time?: string | null
          event_name?: string | null
          event_start_time?: string | null
          event_status?: string | null
          event_type?: string | null
          id?: string
          is_active?: boolean | null
          is_consultable_mode?: boolean | null
          openmic_current_count?: number | null
          openmic_enabled?: boolean | null
          openmic_final_limit_enabled?: boolean | null
          openmic_final_limit_minutes?: number | null
          openmic_final_limit_songs?: number | null
          openmic_max_songs?: number | null
          pin_code?: string | null
          pin_required?: boolean | null
          protect_repertoire?: boolean | null
          reopen_active?: boolean | null
          reopen_dediche_used?: number | null
          reopen_extra_dediche?: number | null
          reopen_extra_songs?: number | null
          reopen_message?: string | null
          reopen_mode?: string | null
          reopen_songs_used?: number | null
          reopen_until?: string | null
          updated_at?: string | null
          user_limit_consecutive_enabled?: boolean | null
          user_limit_consecutive_songs?: number | null
          user_limit_cooldown_message?: string | null
          user_limit_dediche_total?: number | null
          user_limit_enabled?: boolean | null
          user_limit_interval_enabled?: boolean | null
          user_limit_interval_minutes?: number | null
          user_limit_mode?: string | null
          user_limit_songs_interval?: number | null
          user_limit_songs_total?: number | null
          user_limit_total_enabled?: boolean | null
          voting_enabled?: boolean | null
        }
        Relationships: []
      }
      event_qr_codes: {
        Row: {
          created_at: string
          created_by: string | null
          event_id: string
          event_type: string
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          pin_code: string
          updated_at: string
          use_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_id: string
          event_type?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          pin_code: string
          updated_at?: string
          use_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_id?: string
          event_type?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          pin_code?: string
          updated_at?: string
          use_count?: number
        }
        Relationships: []
      }
      free_mode_settings: {
        Row: {
          booking_closes_at: string | null
          booking_opens_at: string | null
          catalog_preview_enabled: boolean | null
          catalog_preview_limit_type: string | null
          catalog_preview_limit_value: number | null
          catalog_preview_message: string | null
          close_minutes_before_end: number | null
          closure_message: string | null
          closure_mode: string | null
          closure_preview_enabled: boolean | null
          closure_redirect_url: string | null
          closure_title: string | null
          countdown_end_show_minutes: number | null
          countdown_start_show_minutes: number | null
          created_at: string | null
          dediche_current_count: number | null
          dediche_enabled: boolean | null
          dediche_final_limit_enabled: boolean | null
          dediche_final_limit_minutes: number | null
          dediche_final_limit_total: number | null
          dediche_max_total: number | null
          duration_minutes: number | null
          end_mode: string | null
          event_date: string | null
          event_end_time: string | null
          event_name: string | null
          event_start_time: string | null
          event_status: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_consultable_mode: boolean | null
          openmic_current_count: number | null
          openmic_enabled: boolean | null
          openmic_final_limit_enabled: boolean | null
          openmic_final_limit_minutes: number | null
          openmic_final_limit_songs: number | null
          openmic_max_songs: number | null
          pin_code: string | null
          pin_enabled: boolean | null
          protect_repertoire: boolean | null
          reopen_active: boolean | null
          reopen_dediche_used: number | null
          reopen_extra_dediche: number | null
          reopen_extra_songs: number | null
          reopen_message: string | null
          reopen_mode: string | null
          reopen_songs_used: number | null
          reopen_until: string | null
          start_mode: string | null
          started_at: string | null
          updated_at: string | null
          updated_by: string | null
          user_limit_consecutive_enabled: boolean | null
          user_limit_consecutive_songs: number | null
          user_limit_cooldown_message: string | null
          user_limit_dediche_total: number | null
          user_limit_enabled: boolean | null
          user_limit_interval_enabled: boolean | null
          user_limit_interval_minutes: number | null
          user_limit_mode: string | null
          user_limit_songs_interval: number | null
          user_limit_songs_total: number | null
          user_limit_total_enabled: boolean | null
          voting_enabled: boolean | null
        }
        Insert: {
          booking_closes_at?: string | null
          booking_opens_at?: string | null
          catalog_preview_enabled?: boolean | null
          catalog_preview_limit_type?: string | null
          catalog_preview_limit_value?: number | null
          catalog_preview_message?: string | null
          close_minutes_before_end?: number | null
          closure_message?: string | null
          closure_mode?: string | null
          closure_preview_enabled?: boolean | null
          closure_redirect_url?: string | null
          closure_title?: string | null
          countdown_end_show_minutes?: number | null
          countdown_start_show_minutes?: number | null
          created_at?: string | null
          dediche_current_count?: number | null
          dediche_enabled?: boolean | null
          dediche_final_limit_enabled?: boolean | null
          dediche_final_limit_minutes?: number | null
          dediche_final_limit_total?: number | null
          dediche_max_total?: number | null
          duration_minutes?: number | null
          end_mode?: string | null
          event_date?: string | null
          event_end_time?: string | null
          event_name?: string | null
          event_start_time?: string | null
          event_status?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_consultable_mode?: boolean | null
          openmic_current_count?: number | null
          openmic_enabled?: boolean | null
          openmic_final_limit_enabled?: boolean | null
          openmic_final_limit_minutes?: number | null
          openmic_final_limit_songs?: number | null
          openmic_max_songs?: number | null
          pin_code?: string | null
          pin_enabled?: boolean | null
          protect_repertoire?: boolean | null
          reopen_active?: boolean | null
          reopen_dediche_used?: number | null
          reopen_extra_dediche?: number | null
          reopen_extra_songs?: number | null
          reopen_message?: string | null
          reopen_mode?: string | null
          reopen_songs_used?: number | null
          reopen_until?: string | null
          start_mode?: string | null
          started_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_limit_consecutive_enabled?: boolean | null
          user_limit_consecutive_songs?: number | null
          user_limit_cooldown_message?: string | null
          user_limit_dediche_total?: number | null
          user_limit_enabled?: boolean | null
          user_limit_interval_enabled?: boolean | null
          user_limit_interval_minutes?: number | null
          user_limit_mode?: string | null
          user_limit_songs_interval?: number | null
          user_limit_songs_total?: number | null
          user_limit_total_enabled?: boolean | null
          voting_enabled?: boolean | null
        }
        Update: {
          booking_closes_at?: string | null
          booking_opens_at?: string | null
          catalog_preview_enabled?: boolean | null
          catalog_preview_limit_type?: string | null
          catalog_preview_limit_value?: number | null
          catalog_preview_message?: string | null
          close_minutes_before_end?: number | null
          closure_message?: string | null
          closure_mode?: string | null
          closure_preview_enabled?: boolean | null
          closure_redirect_url?: string | null
          closure_title?: string | null
          countdown_end_show_minutes?: number | null
          countdown_start_show_minutes?: number | null
          created_at?: string | null
          dediche_current_count?: number | null
          dediche_enabled?: boolean | null
          dediche_final_limit_enabled?: boolean | null
          dediche_final_limit_minutes?: number | null
          dediche_final_limit_total?: number | null
          dediche_max_total?: number | null
          duration_minutes?: number | null
          end_mode?: string | null
          event_date?: string | null
          event_end_time?: string | null
          event_name?: string | null
          event_start_time?: string | null
          event_status?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_consultable_mode?: boolean | null
          openmic_current_count?: number | null
          openmic_enabled?: boolean | null
          openmic_final_limit_enabled?: boolean | null
          openmic_final_limit_minutes?: number | null
          openmic_final_limit_songs?: number | null
          openmic_max_songs?: number | null
          pin_code?: string | null
          pin_enabled?: boolean | null
          protect_repertoire?: boolean | null
          reopen_active?: boolean | null
          reopen_dediche_used?: number | null
          reopen_extra_dediche?: number | null
          reopen_extra_songs?: number | null
          reopen_message?: string | null
          reopen_mode?: string | null
          reopen_songs_used?: number | null
          reopen_until?: string | null
          start_mode?: string | null
          started_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_limit_consecutive_enabled?: boolean | null
          user_limit_consecutive_songs?: number | null
          user_limit_cooldown_message?: string | null
          user_limit_dediche_total?: number | null
          user_limit_enabled?: boolean | null
          user_limit_interval_enabled?: boolean | null
          user_limit_interval_minutes?: number | null
          user_limit_mode?: string | null
          user_limit_songs_interval?: number | null
          user_limit_songs_total?: number | null
          user_limit_total_enabled?: boolean | null
          voting_enabled?: boolean | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      global_format_settings: {
        Row: {
          format_key: string
          is_active: boolean
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          format_key: string
          is_active?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          format_key?: string
          is_active?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      group_join_requests: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          requester_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          requester_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          requester_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_join_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_stats: {
        Row: {
          badges_count: number
          created_at: string
          current_streak: number
          id: string
          last_participation_date: string | null
          max_streak: number
          participant_name: string
          session_fingerprint: string | null
          total_dedications: number
          total_points: number
          total_songs: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          badges_count?: number
          created_at?: string
          current_streak?: number
          id?: string
          last_participation_date?: string | null
          max_streak?: number
          participant_name: string
          session_fingerprint?: string | null
          total_dedications?: number
          total_points?: number
          total_songs?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          badges_count?: number
          created_at?: string
          current_streak?: number
          id?: string
          last_participation_date?: string | null
          max_streak?: number
          participant_name?: string
          session_fingerprint?: string | null
          total_dedications?: number
          total_points?: number
          total_songs?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      live_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          session_fingerprint: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          session_fingerprint?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          session_fingerprint?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      live_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          custom_pin: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          event_link_code: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          pin_code: string
          protected_formats: string[] | null
          section: string
          sessions_invalidated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_pin?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          event_link_code?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          pin_code: string
          protected_formats?: string[] | null
          section: string
          sessions_invalidated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_pin?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          event_link_code?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          pin_code?: string
          protected_formats?: string[] | null
          section?: string
          sessions_invalidated_at?: string | null
        }
        Relationships: []
      }
      message_requests: {
        Row: {
          created_at: string
          id: string
          recipient_id: string
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_id: string
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          recipient_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          admin_reply: string | null
          created_at: string
          id: string
          is_read: boolean
          message_text: string
          replied_at: string | null
          sender_name: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message_text: string
          replied_at?: string | null
          sender_name: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message_text?: string
          replied_at?: string | null
          sender_name?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          message_body: string
          notification_type: string
          recipient: string
          reservation_id: string | null
          status: string
          subject: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_body: string
          notification_type: string
          recipient: string
          reservation_id?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_body?: string
          notification_type?: string
          recipient?: string
          reservation_id?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          dediche_email_enabled: boolean
          dediche_telegram_enabled: boolean
          email_enabled: boolean
          email_recipient: string
          id: string
          openmic_email_enabled: boolean
          openmic_telegram_enabled: boolean
          telegram_dediche_chat_id: string
          telegram_enabled: boolean
          telegram_openmic_chat_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          dediche_email_enabled?: boolean
          dediche_telegram_enabled?: boolean
          email_enabled?: boolean
          email_recipient?: string
          id?: string
          openmic_email_enabled?: boolean
          openmic_telegram_enabled?: boolean
          telegram_dediche_chat_id?: string
          telegram_enabled?: boolean
          telegram_openmic_chat_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          dediche_email_enabled?: boolean
          dediche_telegram_enabled?: boolean
          email_enabled?: boolean
          email_recipient?: string
          id?: string
          openmic_email_enabled?: boolean
          openmic_telegram_enabled?: boolean
          telegram_dediche_chat_id?: string
          telegram_enabled?: boolean
          telegram_openmic_chat_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          admin_user_id: string
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          expires_at?: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_vote_counts: {
        Row: {
          fire_votes: number
          heart_votes: number
          reservation_id: string
          total_votes: number
          updated_at: string
        }
        Insert: {
          fire_votes?: number
          heart_votes?: number
          reservation_id: string
          total_votes?: number
          updated_at?: string
        }
        Update: {
          fire_votes?: number
          heart_votes?: number
          reservation_id?: string
          total_votes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_vote_counts_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_votes: {
        Row: {
          created_at: string
          id: string
          reservation_id: string
          vote_type: string
          voter_fingerprint: string
          voter_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reservation_id: string
          vote_type?: string
          voter_fingerprint: string
          voter_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reservation_id?: string
          vote_type?: string
          voter_fingerprint?: string
          voter_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_votes_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      pin_sessions: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          format: string
          id: string
          invalidated_at: string | null
          invalidation_reason: string | null
          is_valid: boolean
          last_validated_at: string
          live_session_id: string
          pin_code_hash: string
          session_token: string
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          format: string
          id?: string
          invalidated_at?: string | null
          invalidation_reason?: string | null
          is_valid?: boolean
          last_validated_at?: string
          live_session_id: string
          pin_code_hash: string
          session_token: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          format?: string
          id?: string
          invalidated_at?: string | null
          invalidation_reason?: string | null
          is_valid?: boolean
          last_validated_at?: string
          live_session_id?: string
          pin_code_hash?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "pin_sessions_live_session_id_fkey"
            columns: ["live_session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pin_sessions_live_session_id_fkey"
            columns: ["live_session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          id: string
          likes_count: number
          link_preview: Json | null
          link_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          link_preview?: Json | null
          link_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          link_preview?: Json | null
          link_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      private_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_online: boolean | null
          last_seen_at: string | null
          settings: Json | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          settings?: Json | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          settings?: Json | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_info: Json | null
          endpoint: string
          id: string
          last_used_at: string
          p256dh: string
          user_identifier: string | null
          user_type: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_info?: Json | null
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh: string
          user_identifier?: string | null
          user_type?: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_info?: Json | null
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh?: string
          user_identifier?: string | null
          user_type?: string
        }
        Relationships: []
      }
      reservation_statuses: {
        Row: {
          created_at: string
          id: string
          reservation_id: string
          song_artist: string
          song_key: string
          song_title: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reservation_id: string
          song_artist: string
          song_key: string
          song_title: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reservation_id?: string
          song_artist?: string
          song_key?: string
          song_title?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_statuses_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          completed_at: string | null
          created_at: string
          customer_name: string
          dedication_message: string | null
          id: string
          song_artist: string
          song_key: string | null
          song_title: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          customer_name: string
          dedication_message?: string | null
          id?: string
          song_artist: string
          song_key?: string | null
          song_title: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          customer_name?: string
          dedication_message?: string | null
          id?: string
          song_artist?: string
          song_key?: string | null
          song_title?: string
          status?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      section_public_settings: {
        Row: {
          display_name: string
          is_enabled: boolean
          section_key: string
          updated_at: string
        }
        Insert: {
          display_name: string
          is_enabled?: boolean
          section_key: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          is_enabled?: boolean
          section_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      section_settings: {
        Row: {
          description: string | null
          display_name: string
          id: string
          is_enabled: boolean | null
          section_key: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          display_name: string
          id?: string
          is_enabled?: boolean | null
          section_key: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          display_name?: string
          id?: string
          is_enabled?: boolean | null
          section_key?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      security_rate_limits: {
        Row: {
          action_type: string
          attempted_at: string | null
          id: string
          identifier: string
          success: boolean
          target_id: string | null
        }
        Insert: {
          action_type: string
          attempted_at?: string | null
          id?: string
          identifier: string
          success?: boolean
          target_id?: string | null
        }
        Update: {
          action_type?: string
          attempted_at?: string | null
          id?: string
          identifier?: string
          success?: boolean
          target_id?: string | null
        }
        Relationships: []
      }
      songs: {
        Row: {
          artista: string
          created_at: string
          id: string
          slug: string | null
          testo: string | null
          titolo: string
          updated_at: string | null
        }
        Insert: {
          artista: string
          created_at?: string
          id?: string
          slug?: string | null
          testo?: string | null
          titolo: string
          updated_at?: string | null
        }
        Update: {
          artista?: string
          created_at?: string
          id?: string
          slug?: string | null
          testo?: string | null
          titolo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          expires_at: string
          id: string
          session_id: string
          started_at: string
          user_name: string
        }
        Insert: {
          conversation_id: string
          expires_at?: string
          id?: string
          session_id: string
          started_at?: string
          user_name: string
        }
        Update: {
          conversation_id?: string
          expires_at?: string
          id?: string
          session_id?: string
          started_at?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_description: string | null
          badge_icon: string
          badge_key: string
          badge_name: string
          earned_at: string
          id: string
          participant_name: string
          session_fingerprint: string | null
          user_id: string | null
        }
        Insert: {
          badge_description?: string | null
          badge_icon?: string
          badge_key: string
          badge_name: string
          earned_at?: string
          id?: string
          participant_name: string
          session_fingerprint?: string | null
          user_id?: string | null
        }
        Update: {
          badge_description?: string | null
          badge_icon?: string
          badge_key?: string
          badge_name?: string
          earned_at?: string
          id?: string
          participant_name?: string
          session_fingerprint?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_booking_counts: {
        Row: {
          consecutive_songs: number | null
          created_at: string | null
          customer_name: string | null
          dediche_count: number
          event_id: string
          first_booking_at: string | null
          id: string
          interval_window_started_at: string | null
          last_booking_at: string | null
          last_reservation_id: string | null
          session_fingerprint: string
          songs_count: number
          songs_interval_count: number
          updated_at: string | null
        }
        Insert: {
          consecutive_songs?: number | null
          created_at?: string | null
          customer_name?: string | null
          dediche_count?: number
          event_id: string
          first_booking_at?: string | null
          id?: string
          interval_window_started_at?: string | null
          last_booking_at?: string | null
          last_reservation_id?: string | null
          session_fingerprint: string
          songs_count?: number
          songs_interval_count?: number
          updated_at?: string | null
        }
        Update: {
          consecutive_songs?: number | null
          created_at?: string | null
          customer_name?: string | null
          dediche_count?: number
          event_id?: string
          first_booking_at?: string | null
          id?: string
          interval_window_started_at?: string | null
          last_booking_at?: string | null
          last_reservation_id?: string | null
          session_fingerprint?: string
          songs_count?: number
          songs_interval_count?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      user_participations: {
        Row: {
          created_at: string
          event_date: string
          format_type: string
          id: string
          participant_name: string
          points_earned: number
          reservation_id: string | null
          session_fingerprint: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_date?: string
          format_type?: string
          id?: string
          participant_name: string
          points_earned?: number
          reservation_id?: string | null
          session_fingerprint?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_date?: string
          format_type?: string
          id?: string
          participant_name?: string
          points_earned?: number
          reservation_id?: string | null
          session_fingerprint?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_participations_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          granted: boolean
          granted_by: string | null
          id: string
          permission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          granted_by?: string | null
          id?: string
          permission_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          granted_by?: string | null
          id?: string
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      live_sessions_public: {
        Row: {
          created_at: string | null
          event_link_code: string | null
          expires_at: string | null
          id: string | null
          is_active: boolean | null
          protected_formats: string[] | null
          section: string | null
        }
        Insert: {
          created_at?: string | null
          event_link_code?: string | null
          expires_at?: string | null
          id?: string | null
          is_active?: boolean | null
          protected_formats?: string[] | null
          section?: string | null
        }
        Update: {
          created_at?: string | null
          event_link_code?: string | null
          expires_at?: string | null
          id?: string | null
          is_active?: boolean | null
          protected_formats?: string[] | null
          section?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_message_user: {
        Args: { recipient: string; sender: string }
        Returns: boolean
      }
      cleanup_expired_typing_indicators: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      cleanup_old_reactions: { Args: never; Returns: undefined }
      create_pin_session: {
        Args: {
          p_device_fingerprint?: string
          p_format: string
          p_live_session_id: string
          p_pin_code: string
        }
        Returns: string
      }
      get_active_session_for_format: {
        Args: { p_format: string }
        Returns: {
          event_link_code: string
          expires_at: string
          id: string
          pin_code: string
          protected_formats: string[]
        }[]
      }
      get_session_by_link_code: {
        Args: { p_link_code: string }
        Returns: {
          expires_at: string
          id: string
          is_active: boolean
          pin_code: string
          protected_formats: string[]
        }[]
      }
      has_permission: {
        Args: { _permission_name: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invalidate_pin_sessions: {
        Args: { p_live_session_id: string; p_reason?: string }
        Returns: number
      }
      is_conversation_participant: {
        Args: {
          p_conversation_id: string
          p_session_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_format_protected: { Args: { p_format: string }; Returns: boolean }
      is_live_session_active: { Args: { p_section: string }; Returns: boolean }
      is_operator: { Args: { _user_id: string }; Returns: boolean }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      is_session_participant: {
        Args: { conv_id: string; session: string }
        Returns: boolean
      }
      kick_all_remote_sessions: {
        Args: { p_access_id: string }
        Returns: number
      }
      normalize_song_text: { Args: { t: string }; Returns: string }
      remote_update_highlight_line: {
        Args: {
          p_highlight_line: number
          p_sala_code: string
          p_session_id: string
        }
        Returns: boolean
      }
      remote_update_scroll_position: {
        Args: {
          p_sala_code: string
          p_scroll_position: number
          p_session_id: string
        }
        Returns: boolean
      }
      touch_pin_session: { Args: { p_token: string }; Returns: undefined }
      validate_event_pin: {
        Args: { p_format?: string; p_pin: string }
        Returns: {
          is_valid: boolean
          live_session_id: string
          protected_formats: string[]
        }[]
      }
      validate_event_qr_pin: {
        Args: { p_format?: string; p_pin: string }
        Returns: {
          event_id: string
          event_name: string
          event_type: string
          is_live: boolean
          is_valid: boolean
          qr_name: string
        }[]
      }
      validate_format_pin: {
        Args: { p_format: string; p_pin: string }
        Returns: boolean
      }
      validate_live_session_pin: {
        Args: { p_pin: string; p_section: string }
        Returns: boolean
      }
      validate_pin_session: {
        Args: { p_format: string; p_token: string }
        Returns: {
          is_valid: boolean
          live_session_id: string
          pin_code: string
          protected_formats: string[]
        }[]
      }
      validate_remote_access: {
        Args: { p_pin: string; p_token: string }
        Returns: {
          access_id: string
          is_valid: boolean
          sala_code: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "owner" | "operator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "owner", "operator"],
    },
  },
} as const
