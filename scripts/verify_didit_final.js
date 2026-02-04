
const WORKFLOW_ID = "94398e9e-4550-4d64-9947-f58173fa8c3d";
const API_KEY = "yNYBmujxI5Mku3HYS6ShzFCpRr4_6XYjwzuDdxzQg3Q";
const URL = "https://verification.didit.me/v3/session/";

async function verify() {
    console.log(`Testing Session Creation with Workflow ID: ${WORKFLOW_ID}...`);

    const payload = {
        workflow_id: WORKFLOW_ID,
        vendor_data: "test_user_final_verification",
        callback: "https://example.com/webhook",
        vendor_internal_id: "test_user_final_verification"
    };

    try {
        const res = await fetch(URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        console.log("Status:", res.status);
        if (res.ok) {
            const data = await res.json();
            console.log("SUCCESS! Session Created.");
            console.log("Session URL:", data.url);
            console.log("Session ID:", data.session_id);
        } else {
            console.log("Error:", await res.text());
        }
    } catch (e) { console.error(e); }
}

verify();
