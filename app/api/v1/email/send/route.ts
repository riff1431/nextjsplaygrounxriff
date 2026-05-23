/**
 * Internal Email Dispatch API
 *
 * POST /api/v1/email/send
 * Body: { templateId, recipientUserId, data }
 *
 * Server-to-server only — validates service role key.
 * Also callable from server components/route handlers
 * by importing sendEmailToUser() directly.
 */

import { NextResponse } from "next/server";
import React from "react";
import { sendEmail, getUserEmail } from "@/lib/email";

// Template imports
import WelcomeEmail from "@/lib/email-templates/welcome";
import WalletDepositSuccessEmail from "@/lib/email-templates/wallet-deposit-success";
import WalletLowBalanceEmail from "@/lib/email-templates/wallet-low-balance";
import WithdrawalRequestedEmail from "@/lib/email-templates/withdrawal-requested";
import WithdrawalApprovedEmail from "@/lib/email-templates/withdrawal-approved";
import WithdrawalRejectedEmail from "@/lib/email-templates/withdrawal-rejected";
import AccountSuspendedEmail from "@/lib/email-templates/account-suspended";
import AccountReinstatedEmail from "@/lib/email-templates/account-reinstated";
import AccountBannedEmail from "@/lib/email-templates/account-banned";
import AccountReportedEmail from "@/lib/email-templates/account-reported";
import KycApprovedEmail from "@/lib/email-templates/kyc-approved";
import KycRejectedEmail from "@/lib/email-templates/kyc-rejected";
import SessionEarningsEmail from "@/lib/email-templates/session-earnings";
import NewSubscriberEmail from "@/lib/email-templates/new-subscriber";
import PasswordChangedEmail from "@/lib/email-templates/password-changed";

// ─── Template Registry ──────────────────────────────────────
interface TemplateEntry {
    subject: (data: any) => string;
    component: (data: any) => React.ReactElement;
}

const TEMPLATES: Record<string, TemplateEntry> = {
    welcome: {
        subject: (d) => `Welcome to PlayGroundX, ${d.firstName || "there"}! 🎉`,
        component: (d) => React.createElement(WelcomeEmail, d),
    },
    "wallet-deposit-success": {
        subject: (d) => `Deposit of $${(d.amount || 0).toFixed(2)} confirmed ✅`,
        component: (d) => React.createElement(WalletDepositSuccessEmail, d),
    },
    "wallet-low-balance": {
        subject: () => `⚠️ Your wallet balance is running low`,
        component: (d) => React.createElement(WalletLowBalanceEmail, d),
    },
    "withdrawal-requested": {
        subject: (d) => `Withdrawal request of $${(d.amount || 0).toFixed(2)} received`,
        component: (d) => React.createElement(WithdrawalRequestedEmail, d),
    },
    "withdrawal-approved": {
        subject: (d) => `Withdrawal of $${(d.amount || 0).toFixed(2)} approved ✅`,
        component: (d) => React.createElement(WithdrawalApprovedEmail, d),
    },
    "withdrawal-rejected": {
        subject: () => `Withdrawal request update — action required`,
        component: (d) => React.createElement(WithdrawalRejectedEmail, d),
    },
    "account-suspended": {
        subject: () => `Important: Your PlayGroundX account has been restricted`,
        component: (d) => React.createElement(AccountSuspendedEmail, d),
    },
    "account-reinstated": {
        subject: () => `Your PlayGroundX account has been reinstated ✅`,
        component: (d) => React.createElement(AccountReinstatedEmail, d),
    },
    "account-banned": {
        subject: () => `Your PlayGroundX account has been terminated`,
        component: (d) => React.createElement(AccountBannedEmail, d),
    },
    "account-reported": {
        subject: () => `Content review notice — PlayGroundX`,
        component: (d) => React.createElement(AccountReportedEmail, d),
    },
    "kyc-approved": {
        subject: () => `Your identity has been verified! 🎉`,
        component: (d) => React.createElement(KycApprovedEmail, d),
    },
    "kyc-rejected": {
        subject: () => `KYC verification update — resubmission needed`,
        component: (d) => React.createElement(KycRejectedEmail, d),
    },
    "session-earnings": {
        subject: (d) => `Session complete — you earned $${(d.netEarnings || 0).toFixed(2)}`,
        component: (d) => React.createElement(SessionEarningsEmail, d),
    },
    "new-subscriber": {
        subject: (d) => `${d.fanName || "Someone"} just subscribed to you! 🎉`,
        component: (d) => React.createElement(NewSubscriberEmail, d),
    },
    "password-changed": {
        subject: () => `Your PlayGroundX password was changed 🔒`,
        component: (d) => React.createElement(PasswordChangedEmail, d),
    },
};

// ─── Public Helper (importable from server code) ────────────
/**
 * Send an email to a user by their user ID.
 * Use this from any server-side code (API routes, server components).
 */
export async function sendEmailToUser(
    templateId: string,
    recipientUserId: string,
    data: Record<string, any> = {}
) {
    const template = TEMPLATES[templateId];
    if (!template) {
        console.error(`[Email] Unknown template: ${templateId}`);
        return { success: false, error: `Unknown template: ${templateId}` };
    }

    const userInfo = await getUserEmail(recipientUserId);
    if (!userInfo) {
        console.error(`[Email] Could not find email for user: ${recipientUserId}`);
        return { success: false, error: "User email not found" };
    }

    // Inject firstName if not provided
    const mergedData = { firstName: userInfo.name, ...data };

    return sendEmail({
        to: userInfo.email,
        subject: template.subject(mergedData),
        react: template.component(mergedData),
        templateId,
        userId: recipientUserId,
        metadata: data,
    });
}

// ─── POST Handler ────────────────────────────────────────────
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { templateId, recipientUserId, data } = body;

        if (!templateId || !recipientUserId) {
            return NextResponse.json(
                { error: "templateId and recipientUserId are required" },
                { status: 400 }
            );
        }

        const result = await sendEmailToUser(templateId, recipientUserId, data || {});

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, resendId: result.resendId });
    } catch (err: any) {
        console.error("[Email API] Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
