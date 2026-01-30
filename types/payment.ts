export type PaymentProvider = 'stripe' | 'paypal' | 'bank';

export interface PaymentSetting {
    id: string;
    provider: PaymentProvider;
    is_enabled: boolean;
    config: Record<string, any>; // Public config
    // secret_config should never reach the client
    created_at: string;
    updated_at: string;
}
