export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'customer' | 'driver' | 'partner'
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role: 'admin' | 'customer' | 'driver' | 'partner'
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'admin' | 'customer' | 'driver' | 'partner'
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      laundries: {
        Row: {
          id: string
          owner_id: string
          name: string
          status: 'pending' | 'active' | 'rejected' | 'more_info_needed'
          address: string
          latitude: number
          longitude: number
          capacity: number
          rating: number | null
          services_offered: string[]
          operating_hours: Json
          bank_details: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          status?: 'pending' | 'active' | 'rejected' | 'more_info_needed'
          address: string
          latitude: number
          longitude: number
          capacity: number
          rating?: number | null
          services_offered?: string[]
          operating_hours?: Json
          bank_details?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          status?: 'pending' | 'active' | 'rejected' | 'more_info_needed'
          address?: string
          latitude?: number
          longitude?: number
          capacity?: number
          rating?: number | null
          services_offered?: string[]
          operating_hours?: Json
          bank_details?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      drivers: {
        Row: {
          id: string
          user_id: string
          is_active: boolean
          current_lat: number | null
          current_long: number | null
          license_number: string
          vehicle_type: string
          vehicle_registration: string
          rating: number | null
          acceptance_rate: number | null
          on_time_percentage: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          is_active?: boolean
          current_lat?: number | null
          current_long?: number | null
          license_number: string
          vehicle_type: string
          vehicle_registration: string
          rating?: number | null
          acceptance_rate?: number | null
          on_time_percentage?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          is_active?: boolean
          current_lat?: number | null
          current_long?: number | null
          license_number?: string
          vehicle_type?: string
          vehicle_registration?: string
          rating?: number | null
          acceptance_rate?: number | null
          on_time_percentage?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          customer_id: string
          laundry_id: string | null
          status: 'pending' | 'accepted' | 'picked_up' | 'at_laundry' | 'washing' | 'ready_for_delivery' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'disputed'
          total_amount: number
          commission_amount: number
          pickup_address: string
          delivery_address: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          laundry_id?: string | null
          status?: 'pending' | 'accepted' | 'picked_up' | 'at_laundry' | 'washing' | 'ready_for_delivery' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'disputed'
          total_amount: number
          commission_amount?: number
          pickup_address: string
          delivery_address: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          laundry_id?: string | null
          status?: 'pending' | 'accepted' | 'picked_up' | 'at_laundry' | 'washing' | 'ready_for_delivery' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled' | 'disputed'
          total_amount?: number
          commission_amount?: number
          pickup_address?: string
          delivery_address?: string
          created_at?: string
          updated_at?: string
        }
      }
      deliveries: {
        Row: {
          id: string
          order_id: string
          driver_id: string | null
          task_type: 'pickup' | 'delivery'
          status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected' | 'cancelled'
          pickup_lat: number | null
          pickup_long: number | null
          delivery_lat: number | null
          delivery_long: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          driver_id?: string | null
          task_type: 'pickup' | 'delivery'
          status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected' | 'cancelled'
          pickup_lat?: number | null
          pickup_long?: number | null
          delivery_lat?: number | null
          delivery_long?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          driver_id?: string | null
          task_type?: 'pickup' | 'delivery'
          status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected' | 'cancelled'
          pickup_lat?: number | null
          pickup_long?: number | null
          delivery_lat?: number | null
          delivery_long?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      admin_audit_logs: {
        Row: {
          id: string
          admin_id: string
          action: string
          resource_type: string
          resource_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          resource_type: string
          resource_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          resource_type?: string
          resource_id?: string | null
          details?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
