// Hand-written to mirror supabase/migrations/0001_init.sql. If the schema
// changes, regenerate with `supabase gen types typescript` once a live
// project exists, or edit this file to match.
import type { TemplateCanvas } from "./canvas";

export type ProfileRole = "clinician" | "patient";
export type ClinicianPatientStatus = "invited" | "active" | "archived";
export type TemplateStatus = "draft" | "published" | "archived";
export type AssignmentStatus = "assigned" | "in_progress" | "completed";

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
    };
    Functions: {
      claim_invite: {
        Args: { p_invite_code: string };
        Returns: Database["public"]["Tables"]["clinician_patients"]["Row"];
      };
    };
  };
};
