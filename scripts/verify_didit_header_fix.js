
const WORKFLOW_ID = "94398e9e-4550-4d64-9947-f58173fa8c3d";
const API_KEY = "eG-rjmIaALHe-AHVYPSAF1El14nh2MKubK_4Yh5bZro";
const URL = "https://verification.didit.me/v3/session/";

async function verify() {
    console.log(`Testing Session Creation with x-api-key Header...`);

    const payload = {
        workflow_id: WORKFLOW_ID,
        vendor_data: "test_user_confirmation",
        callback: "https://example.com/webhook",
        vendor_internal_id: "test_user_confirmation"
    };

    try {
        const res = await fetch(URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY  // Using correct header name
            },
            body: JSON.stringify(payload)
        });

        console.log("Status:", res.status);
        if (res.ok) {
            const data = await res.json();
            console.log("SUCCESS! Session Created.");
            console.log("Session URL:", data.url);
        } else {
            console.log("Error:", await res.text());
        }
    } catch (e) { console.error(e); }
}

verify();
