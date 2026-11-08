export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CampaignStatusDb = "DRAFT" | "ACTIVE" | "CLOSED" | "SETTLED";

export type AssetResultDb =
  | "PENDING"
  | "AI_GENERATED"
  | "HUMAN_CREATED"
  | "TIE"
  | "INSUFFICIENT_VOTES";

export type ChainInstructionDb =
  | "create_campaign"
  | "register_asset"
  | "fund_campaign"
  | "vote"
  | "close_campaign"
  | "finalize_asset"
  | "claim_reward"
  | "refund_campaign";

export type AssetMimeTypeDb = "image/jpeg" | "image/png" | "image/webp";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          wallet_address: string;
          display_name: string | null;
          bio: string | null;
          website_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          display_name?: string | null;
          bio?: string | null;
          website_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          display_name?: string | null;
          bio?: string | null;
          website_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaign_metadata: {
        Row: {
          id: string;
          campaign_pubkey: string;
          company_wallet: string;
          campaign_id: number;
          title: string;
          description: string | null;
          category: string | null;
          tags: string[];
          total_budget_lamports: number;
          expected_asset_count: number;
          min_votes: number;
          voting_deadline: string;
          claim_deadline: string;
          onchain_status: CampaignStatusDb;
          cached_registered_asset_count: number;
          cached_finalized_asset_count: number;
          cached_total_claimed_lamports: number;
          is_listed: boolean;
          create_tx_signature: string;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_pubkey: string;
          company_wallet: string;
          campaign_id: number;
          title: string;
          description?: string | null;
          category?: string | null;
          tags?: string[];
          total_budget_lamports: number;
          expected_asset_count: number;
          min_votes: number;
          voting_deadline: string;
          claim_deadline: string;
          onchain_status?: CampaignStatusDb;
          cached_registered_asset_count?: number;
          cached_finalized_asset_count?: number;
          cached_total_claimed_lamports?: number;
          is_listed?: boolean;
          create_tx_signature: string;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_pubkey?: string;
          company_wallet?: string;
          campaign_id?: number;
          title?: string;
          description?: string | null;
          category?: string | null;
          tags?: string[];
          total_budget_lamports?: number;
          expected_asset_count?: number;
          min_votes?: number;
          voting_deadline?: string;
          claim_deadline?: string;
          onchain_status?: CampaignStatusDb;
          cached_registered_asset_count?: number;
          cached_finalized_asset_count?: number;
          cached_total_claimed_lamports?: number;
          is_listed?: boolean;
          create_tx_signature?: string;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_metadata_company_wallet_fkey";
            columns: ["company_wallet"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["wallet_address"];
          },
        ];
      };
      asset_metadata: {
        Row: {
          id: string;
          campaign_pubkey: string;
          asset_index: number;
          asset_pubkey: string | null;
          content_hash: string;
          storage_path: string;
          original_filename: string | null;
          mime_type: AssetMimeTypeDb;
          size_bytes: number;
          width: number | null;
          height: number | null;
          caption: string | null;
          cached_ai_votes: number;
          cached_human_votes: number;
          cached_total_votes: number;
          cached_result: AssetResultDb;
          cached_winning_votes: number;
          cached_reward_pool_lamports: number;
          cached_finalized: boolean;
          register_tx_signature: string | null;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_pubkey: string;
          asset_index: number;
          asset_pubkey?: string | null;
          content_hash: string;
          storage_path: string;
          original_filename?: string | null;
          mime_type: AssetMimeTypeDb;
          size_bytes: number;
          width?: number | null;
          height?: number | null;
          caption?: string | null;
          cached_ai_votes?: number;
          cached_human_votes?: number;
          cached_total_votes?: number;
          cached_result?: AssetResultDb;
          cached_winning_votes?: number;
          cached_reward_pool_lamports?: number;
          cached_finalized?: boolean;
          register_tx_signature?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_pubkey?: string;
          asset_index?: number;
          asset_pubkey?: string | null;
          content_hash?: string;
          storage_path?: string;
          original_filename?: string | null;
          mime_type?: AssetMimeTypeDb;
          size_bytes?: number;
          width?: number | null;
          height?: number | null;
          caption?: string | null;
          cached_ai_votes?: number;
          cached_human_votes?: number;
          cached_total_votes?: number;
          cached_result?: AssetResultDb;
          cached_winning_votes?: number;
          cached_reward_pool_lamports?: number;
          cached_finalized?: boolean;
          register_tx_signature?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "asset_metadata_campaign_pubkey_fkey";
            columns: ["campaign_pubkey"];
            isOneToOne: false;
            referencedRelation: "campaign_metadata";
            referencedColumns: ["campaign_pubkey"];
          },
        ];
      };
      chain_transactions: {
        Row: {
          id: string;
          signature: string;
          instruction_index: number;
          instruction: ChainInstructionDb;
          campaign_pubkey: string;
          asset_pubkey: string | null;
          wallet_address: string;
          amount_lamports: number | null;
          slot: number;
          block_time: string | null;
          event_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          signature: string;
          instruction_index?: number;
          instruction: ChainInstructionDb;
          campaign_pubkey: string;
          asset_pubkey?: string | null;
          wallet_address: string;
          amount_lamports?: number | null;
          slot: number;
          block_time?: string | null;
          event_data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          signature?: string;
          instruction_index?: number;
          instruction?: ChainInstructionDb;
          campaign_pubkey?: string;
          asset_pubkey?: string | null;
          wallet_address?: string;
          amount_lamports?: number | null;
          slot?: number;
          block_time?: string | null;
          event_data?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chain_transactions_campaign_pubkey_fkey";
            columns: ["campaign_pubkey"];
            isOneToOne: false;
            referencedRelation: "campaign_metadata";
            referencedColumns: ["campaign_pubkey"];
          },
        ];
      };
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      purge_expired_auth: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];