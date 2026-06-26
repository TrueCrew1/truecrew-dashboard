export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          legacy_id: string | null;
          title: string;
          description: string;
          stage: string;
          workflow_type: string;
          priority: string;
          assignee: string | null;
          due_at: string | null;
          blocker: string | null;
          site_name: string | null;
          crew: string | null;
          sla_tier: string | null;
          waiting_on: string | null;
          github_ref: string | null;
          github_repo: string | null;
          github_issue_number: number | null;
          github_pr_number: number | null;
          github_head_sha: string | null;
          obsidian_note_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          legacy_id?: string | null;
          title: string;
          description?: string;
          stage?: string;
          workflow_type?: string;
          priority?: string;
          assignee?: string | null;
          due_at?: string | null;
          blocker?: string | null;
          site_name?: string | null;
          crew?: string | null;
          sla_tier?: string | null;
          waiting_on?: string | null;
          created_by?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
      };
      gate_checks: {
        Row: {
          id: string;
          task_id: string;
          gate_key: string;
          label: string;
          required: boolean;
          passed: boolean;
          passed_at: string | null;
          source: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          gate_key: string;
          label: string;
          required?: boolean;
          passed?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["gate_checks"]["Insert"]>;
      };
      workflows: {
        Row: {
          id: string;
          legacy_id: string | null;
          title: string;
          type: string;
          stage: string;
          owner: string;
          summary: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          type: string;
          stage?: string;
          owner?: string;
          summary?: string;
          created_by?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workflows"]["Insert"]>;
      };
      workflow_stages: {
        Row: {
          id: string;
          key: string;
          label: string;
          sort_order: number;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          label: string;
          sort_order: number;
          description?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workflow_stages"]["Insert"]>;
      };
      incidents: {
        Row: {
          id: string;
          legacy_id: string | null;
          title: string;
          severity: number;
          status: string;
          service_id: string | null;
          service_name: string;
          summary: string;
          opened_at: string;
          mitigated_at: string | null;
          resolved_at: string | null;
          linked_repair_id: string | null;
          runbook_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          severity: number;
          status?: string;
          service_name: string;
          summary?: string;
          created_by?: string;
        };
        Update: Partial<Database["public"]["Tables"]["incidents"]["Insert"]>;
      };
      tools: {
        Row: {
          id: string;
          name: string;
          slug: string;
          category: string;
          status: string;
          environment: string;
          owner: string;
          url: string | null;
          current_version: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          category: string;
          status?: string;
          environment?: string;
          owner?: string;
          created_by?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tools"]["Insert"]>;
      };
      customers: {
        Row: {
          id: string;
          legacy_id: string | null;
          name: string;
          slug: string;
          tier: string;
          stage: string;
          primary_contact: string;
          email: string;
          health_score: number;
          status: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          tier: string;
          stage: string;
          primary_contact: string;
          email: string;
          health_score?: number;
          status: string;
          created_by?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: "admin" | "employee";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: "admin" | "employee";
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      auth_audit_events: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          role: string | null;
          actor_email: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          role?: string | null;
          actor_email?: string | null;
          metadata?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["auth_audit_events"]["Insert"]>;
      };
      audit_events: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          action: string;
          actor: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          action: string;
          actor?: string | null;
          details?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["audit_events"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"] & {
  gate_checks?: Database["public"]["Tables"]["gate_checks"]["Row"][];
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
