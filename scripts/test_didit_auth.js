
const API_ID = "cb1b9ad7-d99f-435e-ac37-f09b950b256a";
const API_KEY = "yNYBmujxI5Mku3HYS6ShzFCpRr4_6XYjwzuDdxzQg3Q";
const BASE_URL = "https://apx.didit.me/auth/v3/sessions";

async function testAuth() {
    console.log("Testing Didit API Auth...");

    const payload = {
        vendor_internal_id: "test_user_123",
        callback_url: "https://example.com/webhook"
    };

    // Method 1: Bearer Token
    try {
        console.log("\nAttempt 1: Bearer Token with API Key");
        const res = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify(payload)
        });
        console.log("Status:", res.status);
        if (res.ok) console.log("Success:", await res.json());
        else console.log("Error:", await res.text());
    } catch (e) { console.error(e.message); }

    // Method 2: Basic Auth (API_ID:API_KEY)
    try {
        console.log("\nAttempt 2: Basic Auth (API_ID:API_KEY)");
        const authString = Buffer.from(`${API_ID}:${API_KEY}`).toString('base64');
        const res = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${authString}`
            },
            body: JSON.stringify(payload)
        });
        console.log("Status:", res.status);
        if (res.ok) console.log("Success:", await res.json());
        else console.log("Error:", await res.text());
    } catch (e) { console.error(e.message); }

    // Method 3: Custom Headers
    try {
        console.log("\nAttempt 3: Custom Headers");
        const res = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
                "x-client-id": API_ID
            },
            body: JSON.stringify(payload)
        });
        console.log("Status:", res.status);
        if (res.ok) console.log("Success:", await res.json());
        else console.log("Error:", await res.text());
    } catch (e) { console.error(e.message); }
}

testAuth();
