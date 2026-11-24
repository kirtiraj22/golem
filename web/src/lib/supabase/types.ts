import type { PlayerProfile } from "~/lib/auth/types";
import type { PlayerGameState } from "~/app/game/auction/types";

/**
 * Minimal typed schema for the onboarding tables. Keeping this beside the
 * server client gives route handlers typed queries and RPC arguments without
 * hand-written REST helpers.
 */
export type Database = {
  public: {
    Tables: {
      auth_challenges: {
        Row: {
          nonce: string;
          wallet_address: string;
          message: string;
          issued_at: string;
          expires_at: string;
          consumed_at: string | null;
        };
        Insert: {
          nonce: string;
          wallet_address: string;
          message: string;
          issued_at?: string;
          expires_at: string;
          consumed_at?: string | null;
        };
        Update: {
          nonce?: string;
          wallet_address?: string;
          message?: string;
          issued_at?: string;
          expires_at?: string;
          consumed_at?: string | null;
        };
        Relationships: [];
      };
      wallet_sessions: {
        Row: {
          id: string;
          token_hash: string;
          wallet_address: string;
          created_at: string;
          expires_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          token_hash: string;
          wallet_address: string;
          created_at?: string;
          expires_at: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          token_hash?: string;
          wallet_address?: string;
          created_at?: string;
          expires_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      player_profiles: {
        Row: PlayerProfile;
        Insert: {
          id?: string;
          wallet_address: string;
          username: string;
          created_at?: string;
          updated_at?: string;
          last_seen_at?: string;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          username?: string;
          created_at?: string;
          updated_at?: string;
          last_seen_at?: string;
        };
        Relationships: [];
      };
      player_game_state: {
        Row: {
          wallet_address: string;
          state: PlayerGameState;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          wallet_address: string;
          state: PlayerGameState;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          wallet_address?: string;
          state?: PlayerGameState;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      upsert_player_profile: {
        Args: {
          p_wallet_address: string;
          p_username: string;
        };
        Returns: PlayerProfile | PlayerProfile[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
