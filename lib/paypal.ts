export async function generatePayPalAccessToken() {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const base = process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";

    if (!clientId || !clientSecret) {
        throw new Error("MISSING_PAYPAL_CREDENTIALS");
    }

    const auth = Buffer.from(clientId + ":" + clientSecret).toString("base64");
    const response = await fetch(`${base}/v1/oauth2/token`, {
        method: "POST",
        body: "grant_type=client_credentials",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error_description || "Failed to fetch PayPal access token");
    }
    return data.access_token;
}
