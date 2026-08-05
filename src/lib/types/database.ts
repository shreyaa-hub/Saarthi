// Hand-written to mirror supabase/migrations/0001_init.sql. If the schema
// changes, regenerate with `supabase gen types typescript` once a live
// project exists, or edit this file to match.
import type { TemplateCanvas } from "./canvas";

export type ProfileRole = "clinician" | "patient" | "parent";
export type ClinicianPatientStatus = "invited" | "active" | "archived";
export type InvoiceStatus = "draft" | "issued" | "paid" | "void";
export type TemplateStatus = "draft" | "published" | "archived";
export type AssignmentStatus = "assigned" | "in_progress" | "completed";
// Presentation-only — how a client renders a row. Event-specific behaviour
// belongs in messages.metadata, never in this type; new event types extend
// metadata's shape, not this union.
export type MessageType = "TEXT" | "IMAGE" | "FILE" | "SYSTEM";

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: ProfileRole;
          full_name: string;
          email: string | null;
          avatar_color: string | null;
          headline: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          role: ProfileRole;
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      clinician_patients: {
        Row: {
          id: string;
          clinician_id: string;
          patient_id: string | null;
          display_name: string;
          invite_code: string;
          guardian_code: string | null;
          status: ClinicianPatientStatus;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["clinician_patients"]["Row"]> & {
          clinician_id: string;
          display_name: string;
          invite_code: string;
        };
        Update: Partial<Database["public"]["Tables"]["clinician_patients"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "clinician_patients_clinician_id_fkey";
            columns: ["clinician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinician_patients_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      templates: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          domain: string;
          medium: "interactive" | "hybrid" | "print";
          status: TemplateStatus;
          canvas: TemplateCanvas;
          thumbnail_color: string | null;
          deleted_at: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["templates"]["Row"]> & {
          owner_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["templates"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "templates_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      assignments: {
        Row: {
          id: string;
          template_id: string | null;
          clinician_id: string;
          patient_id: string;
          title: string;
          instructions: string | null;
          due_date: string | null;
          status: AssignmentStatus;
          canvas_snapshot: TemplateCanvas;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["assignments"]["Row"]> & {
          clinician_id: string;
          patient_id: string;
          title: string;
          canvas_snapshot: TemplateCanvas;
        };
        Update: Partial<Database["public"]["Tables"]["assignments"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "assignments_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_clinician_id_fkey";
            columns: ["clinician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_attempts: {
        Row: {
          id: string;
          assignment_id: string;
          patient_id: string;
          responses: Json;
          score: number | null;
          correct_count: number;
          total_count: number;
          duration_seconds: number | null;
          clinician_note: string | null;
          completed_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["activity_attempts"]["Row"]> & {
          assignment_id: string;
          patient_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_attempts"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "activity_attempts_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_attempts_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_insights: {
        Row: {
          id: string;
          patient_id: string;
          clinician_id: string;
          summary: string;
          strengths: Json;
          concerns: Json;
          recommendations: Json;
          attempts_considered: number;
          generated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_insights"]["Row"]> & {
          patient_id: string;
          clinician_id: string;
          summary: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_insights"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "ai_insights_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_insights_clinician_id_fkey";
            columns: ["clinician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          // Generic, polymorphic — meaning depends on type. For
          // type === "new_message" this is messages.conversation_id.
          reference_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          user_id: string;
          type: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      assets: {
        Row: {
          id: string;
          owner_id: string;
          url: string;
          alt: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["assets"]["Row"]> & {
          owner_id: string;
          url: string;
        };
        Update: Partial<Database["public"]["Tables"]["assets"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "assets_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          clinician_patient_id: string | null;
          parent_child_id: string | null;
          created_by: string | null;
          last_message_at: string | null;
          last_message_preview: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["conversations"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["conversations"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "conversations_clinician_patient_id_fkey";
            columns: ["clinician_patient_id"];
            isOneToOne: true;
            referencedRelation: "clinician_patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          joined_at: string;
          last_read_at: string | null;
          archived_at: string | null;
          pinned_at: string | null;
          muted_until: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["conversation_participants"]["Row"]> & {
          conversation_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["conversation_participants"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string | null;
          message_type: MessageType;
          body: string | null;
          metadata: Json | null;
          edited_at: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["messages"]["Row"]> & {
          conversation_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      parent_children: {
        Row: {
          id: string;
          parent_id: string;
          child_id: string;
          clinician_patient_id: string | null;
          relationship: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["parent_children"]["Row"]> & {
          parent_id: string;
          child_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["parent_children"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "parent_children_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parent_children_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parent_children_clinician_patient_id_fkey";
            columns: ["clinician_patient_id"];
            isOneToOne: false;
            referencedRelation: "clinician_patients";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          clinician_id: string;
          parent_id: string;
          child_id: string | null;
          reference: string;
          description: string | null;
          amount_cents: number;
          currency: string;
          period_start: string | null;
          period_end: string | null;
          due_date: string | null;
          status: InvoiceStatus;
          issued_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["invoices"]["Row"]> & {
          clinician_id: string;
          parent_id: string;
          reference: string;
          amount_cents: number;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "invoices_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_clinician_id_fkey";
            columns: ["clinician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      parent_saved_worksheets: {
        Row: {
          id: string;
          parent_id: string;
          template_id: string;
          child_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["parent_saved_worksheets"]["Row"]> & {
          parent_id: string;
          template_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["parent_saved_worksheets"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "parent_saved_worksheets_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parent_saved_worksheets_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      claim_guardian_code: {
        Args: { p_guardian_code: string };
        Returns: Database["public"]["Tables"]["parent_children"]["Row"];
      };
      start_parent_conversation: {
        Args: { p_parent_child_id: string };
        Returns: Database["public"]["Tables"]["conversations"]["Row"];
      };
      claim_invite: {
        Args: { p_invite_code: string };
        Returns: Database["public"]["Tables"]["clinician_patients"]["Row"];
      };
      create_notification: {
        Args: {
          p_recipient_id: string;
          p_type: string;
          p_title: string;
          p_body: string | null;
          p_link: string | null;
        };
        Returns: Database["public"]["Tables"]["notifications"]["Row"];
      };
      start_conversation: {
        Args: { p_clinician_patient_id: string };
        Returns: Database["public"]["Tables"]["conversations"]["Row"];
      };
      create_system_message: {
        Args: {
          p_conversation_id: string;
          p_body: string | null;
          p_metadata: Json | null;
        };
        Returns: Database["public"]["Tables"]["messages"]["Row"];
      };
      notify_new_message: {
        Args: {
          p_recipient_id: string;
          p_reference_id: string;
          p_link: string;
          p_title: string;
          p_body: string;
        };
        Returns: Database["public"]["Tables"]["notifications"]["Row"];
      };
    };
  };
};
