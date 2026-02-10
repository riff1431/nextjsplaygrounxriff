
const API_ID = "cb1b9ad7-d99f-435e-ac37-f09b950b256a";
const API_KEY = "yNYBmujxI5Mku3HYS6ShzFCpRr4_6XYjwzuDdxzQg3Q";
const URL = "https://verification.didit.me/v3/session/";

async function debug() {
    console.log(`Testing ${URL} to debug 400 error...`);

    const payload = {
        workflow_id: API_ID,
        vendor_data: "test_user_123",
        callback: "https://example.com/webhook"
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
        console.log("Body:", await res.text());
    } catch (e) { console.error(e); }
}

debug();
