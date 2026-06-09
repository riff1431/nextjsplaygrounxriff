import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        // 1. Verify caller is authenticated
        const supabase = await createClient();
        const { data: { user: caller } } = await supabase.auth.getUser();
        if (!caller) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Verify caller is admin
        const adminClient = createAdminClient();
        const { data: callerProfile } = await adminClient
            .from('profiles')
            .select('role')
            .eq('id', caller.id)
            .maybeSingle();

        const isAdmin = 
            callerProfile?.role === 'admin' ||
            caller.user_metadata?.role === 'admin' ||
            caller.app_metadata?.role === 'admin';

        if (!isAdmin) {
            return NextResponse.json({ error: 'Access denied: Admins only' }, { status: 403 });
        }

        // 3. Load existing configurations from DB to handle secret merge
        const { data: existingAdminSettings } = await adminClient
            .from('admin_settings')
            .select('value')
            .eq('key', 'payment_config')
            .maybeSingle();

        const oldConfig = existingAdminSettings?.value || {};

        // Merge incoming payload with old config to preserve masked/empty secrets
        const finalStripePublicKey = body.stripe?.publicKey || oldConfig.stripe?.publicKey || "";
        const finalStripeSecretKey = (body.stripe?.secretKey && !body.stripe.secretKey.includes('•'))
            ? body.stripe.secretKey
            : oldConfig.stripe?.secretKey || "";

        const finalPaypalClientId = body.paypal?.clientId || oldConfig.paypal?.clientId || "";

        const finalBankName = body.bank?.bankName || oldConfig.bank?.bankName || "";
        const finalBankAccountName = body.bank?.accountName || oldConfig.bank?.accountName || "";
        const finalBankAccountNumber = body.bank?.accountNumber || oldConfig.bank?.accountNumber || "";
        const finalBankRoutingNumber = body.bank?.routingNumber || oldConfig.bank?.routingNumber || "";
        const finalBankInstructions = body.bank?.instructions || oldConfig.bank?.instructions || "";

        const finalRiskMerchantId = body.riskpaygo?.merchantId || oldConfig.riskpaygo?.merchantId || "";
        const finalRiskApiToken = (body.riskpaygo?.apiToken && !body.riskpaygo.apiToken.includes('•'))
            ? body.riskpaygo.apiToken
            : oldConfig.riskpaygo?.apiToken || "";
        const finalRiskWebhookSecret = (body.riskpaygo?.webhookSecret && !body.riskpaygo.webhookSecret.includes('•'))
            ? body.riskpaygo.webhookSecret
            : oldConfig.riskpaygo?.webhookSecret || "";

        const finalNowpaymentsApiKey = (body.nowpayments?.apiKey && !body.nowpayments.apiKey.includes('•'))
            ? body.nowpayments.apiKey
            : oldConfig.nowpayments?.apiKey || "";
        const finalNowpaymentsIpnSecret = (body.nowpayments?.ipnSecret && !body.nowpayments.ipnSecret.includes('•'))
            ? body.nowpayments.ipnSecret
            : oldConfig.nowpayments?.ipnSecret || "";

        const finalPaygateUsdcAddress = (body.paygate?.usdcAddress && !body.paygate.usdcAddress.includes('•'))
            ? body.paygate.usdcAddress
            : oldConfig.paygate?.usdcAddress || "";
        const finalPaygateAffiliateWallet = (body.paygate?.affiliateWallet && !body.paygate.affiliateWallet.includes('•'))
            ? body.paygate.affiliateWallet
            : oldConfig.paygate?.affiliateWallet || "";
        const finalPaygateIpnSecret = (body.paygate?.ipnSecret && !body.paygate.ipnSecret.includes('•'))
            ? body.paygate.ipnSecret
            : oldConfig.paygate?.ipnSecret || "";

        const mergedConfig = {
            stripe: {
                enabled: !!body.stripe?.enabled,
                publicKey: finalStripePublicKey,
                secretKey: finalStripeSecretKey,
            },
            paypal: {
                enabled: !!body.paypal?.enabled,
                clientId: finalPaypalClientId,
            },
            bank: {
                enabled: !!body.bank?.enabled,
                bankName: finalBankName,
                accountName: finalBankAccountName,
                accountNumber: finalBankAccountNumber,
                routingNumber: finalBankRoutingNumber,
                instructions: finalBankInstructions,
            },
            riskpaygo: {
                enabled: !!body.riskpaygo?.enabled,
                apiUrl: body.riskpaygo?.apiUrl || oldConfig.riskpaygo?.apiUrl || "",
                merchantId: finalRiskMerchantId,
                apiToken: finalRiskApiToken,
                webhookSecret: finalRiskWebhookSecret,
                returnUrl: body.riskpaygo?.returnUrl || oldConfig.riskpaygo?.returnUrl || "",
                cancelUrl: body.riskpaygo?.cancelUrl || oldConfig.riskpaygo?.cancelUrl || "",
                mode: body.riskpaygo?.mode || oldConfig.riskpaygo?.mode || "test",
            },
            nowpayments: {
                enabled: !!body.nowpayments?.enabled,
                apiKey: finalNowpaymentsApiKey,
                ipnSecret: finalNowpaymentsIpnSecret,
                mode: body.nowpayments?.mode || oldConfig.nowpayments?.mode || "sandbox",
            },
            paygate: {
                enabled: !!body.paygate?.enabled,
                apiUrl: body.paygate?.apiUrl || oldConfig.paygate?.apiUrl || "https://api.paygate.to",
                checkoutUrl: body.paygate?.checkoutUrl || oldConfig.paygate?.checkoutUrl || "https://checkout.paygate.to",
                usdcAddress: finalPaygateUsdcAddress,
                affiliateWallet: finalPaygateAffiliateWallet,
                commissionPercent: typeof body.paygate?.commissionPercent !== 'undefined' ? Number(body.paygate.commissionPercent) : (oldConfig.paygate?.commissionPercent || 0),
                ipnSecret: finalPaygateIpnSecret,
                returnUrl: body.paygate?.returnUrl || oldConfig.paygate?.returnUrl || "",
                cancelUrl: body.paygate?.cancelUrl || oldConfig.paygate?.cancelUrl || "",
            }
        };

        // 4. Update admin_settings table (key: 'payment_config')
        const { error: adminSettingsError } = await adminClient
            .from('admin_settings')
            .upsert({
                key: 'payment_config',
                value: mergedConfig,
                updated_at: new Date().toISOString()
            });

        if (adminSettingsError) {
            console.error('[Admin Payments Settings API] admin_settings upsert error:', adminSettingsError);
            return NextResponse.json({ error: 'Failed to update admin settings: ' + adminSettingsError.message }, { status: 500 });
        }

        // 5. Update payment_settings table for Stripe, PayPal, Bank, and RiskPayGo
        const now = new Date().toISOString();

        // Sync Stripe
        const { error: stripeErr } = await adminClient
            .from('payment_settings')
            .upsert({
                provider: 'stripe',
                is_enabled: mergedConfig.stripe.enabled,
                config: { public_key: mergedConfig.stripe.publicKey },
                secret_config: { secret_key: mergedConfig.stripe.secretKey },
                updated_at: now
            }, { onConflict: 'provider' });

        if (stripeErr) console.error('[Admin Payments Settings API] Sync stripe error:', stripeErr);

        // Sync PayPal
        const { error: paypalErr } = await adminClient
            .from('payment_settings')
            .upsert({
                provider: 'paypal',
                is_enabled: mergedConfig.paypal.enabled,
                config: { client_id: mergedConfig.paypal.clientId },
                secret_config: {},
                updated_at: now
            }, { onConflict: 'provider' });

        if (paypalErr) console.error('[Admin Payments Settings API] Sync paypal error:', paypalErr);

        // Sync Bank
        const { error: bankErr } = await adminClient
            .from('payment_settings')
            .upsert({
                provider: 'bank',
                is_enabled: mergedConfig.bank.enabled,
                config: {
                    bank_name: mergedConfig.bank.bankName,
                    account_name: mergedConfig.bank.accountName,
                    account_number: mergedConfig.bank.accountNumber,
                    routing_number: mergedConfig.bank.routingNumber,
                    instructions: mergedConfig.bank.instructions
                },
                secret_config: {},
                updated_at: now
            }, { onConflict: 'provider' });

        if (bankErr) console.error('[Admin Payments Settings API] Sync bank error:', bankErr);

        // Sync RiskPayGo
        const { error: riskErr } = await adminClient
            .from('payment_settings')
            .upsert({
                provider: 'riskpaygo',
                is_enabled: mergedConfig.riskpaygo.enabled,
                config: {
                    api_url: mergedConfig.riskpaygo.apiUrl,
                    return_url: mergedConfig.riskpaygo.returnUrl,
                    cancel_url: mergedConfig.riskpaygo.cancelUrl,
                    mode: mergedConfig.riskpaygo.mode
                },
                secret_config: {
                    merchant_id: mergedConfig.riskpaygo.merchantId,
                    api_token: mergedConfig.riskpaygo.apiToken,
                    webhook_secret: mergedConfig.riskpaygo.webhookSecret
                },
                updated_at: now
            }, { onConflict: 'provider' });

        if (riskErr) console.error('[Admin Payments Settings API] Sync riskpaygo error:', riskErr);

        // Sync NOWPayments
        const { error: nowpaymentsErr } = await adminClient
            .from('payment_settings')
            .upsert({
                provider: 'nowpayments',
                is_enabled: mergedConfig.nowpayments.enabled,
                config: {
                    mode: mergedConfig.nowpayments.mode
                },
                secret_config: {
                    api_key: mergedConfig.nowpayments.apiKey,
                    ipn_secret: mergedConfig.nowpayments.ipnSecret
                },
                updated_at: now
            }, { onConflict: 'provider' });

        if (nowpaymentsErr) console.error('[Admin Payments Settings API] Sync nowpayments error:', nowpaymentsErr);

        // Sync PayGate
        const { error: paygateErr } = await adminClient
            .from('payment_settings')
            .upsert({
                provider: 'paygate',
                is_enabled: mergedConfig.paygate.enabled,
                config: {
                    api_url: mergedConfig.paygate.apiUrl,
                    checkout_url: mergedConfig.paygate.checkoutUrl,
                    commission_percent: mergedConfig.paygate.commissionPercent,
                    return_url: mergedConfig.paygate.returnUrl,
                    cancel_url: mergedConfig.paygate.cancelUrl
                },
                secret_config: {
                    usdc_address: mergedConfig.paygate.usdcAddress,
                    affiliate_wallet: mergedConfig.paygate.affiliateWallet,
                    ipn_secret: mergedConfig.paygate.ipnSecret
                },
                updated_at: now
            }, { onConflict: 'provider' });

        if (paygateErr) console.error('[Admin Payments Settings API] Sync paygate error:', paygateErr);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[Admin Payments Settings API] Fatal error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
