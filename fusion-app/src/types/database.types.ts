export type UserRole = 'ADMIN' | 'USER' | 'DRIVER';

export interface Profile {
    id: string;
    role: UserRole;
    full_name: string | null;
    driver_id: string | null;
    rut_empresa: string | null;
    created_at: string;
    updated_at: string;
}

export interface Driver {
    id: string;
    name: string;
    phone: string | null;
    rut: string | null;
    status: string;
    created_at: string;
}

export interface PurchaseOrder {
    id: string;
    client_name: string;
    material: string;
    quantity: number | null;
    unit: string | null;
    delivery_address: string | null;
    delivery_date: string | null;
    delivery_time: string | null;
    driver_id: string | null;
    status: string;
    created_by: string | null;
    created_at: string;
    order_number: string | null;
    order_date: string | null;
    product_code: string | null;
    price: number | null;
    total_price: number | null;
    signed_oc_url: string | null;
}

export interface AppSetting {
    key: string;
    value: any;
    updated_at: string;
}

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Partial<Profile>;
                Update: Partial<Profile>;
            };
            drivers: {
                Row: Driver;
                Insert: Partial<Driver>;
                Update: Partial<Driver>;
            };
            purchase_orders: {
                Row: PurchaseOrder;
                Insert: Partial<PurchaseOrder>;
                Update: Partial<PurchaseOrder>;
            };
            app_settings: {
                Row: AppSetting;
                Insert: Partial<AppSetting>;
                Update: Partial<AppSetting>;
            };
        };
    };
}
