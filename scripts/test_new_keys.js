
const WORKFLOW_ID = "94398e9e-4550-4d64-9947-f58173fa8c3d";
// const APP_ID = "cb1b9ad7-d99f-435e-ac37-f09b950b256a"; // Keeping for reference, but likely not the workflow ID

const KEYS = [
    "eG-rjmIaALHe-AHVYPSAF1El14nh2MKubK_4Yh5bZro",
    "V6uft53PvQ02qIoupazgFzUJNzerSim-8McEL530HMs"
];

const URL = "https://verification.didit.me/v3/session/";

async function verify() {
    console.log(`Testing keys with Workflow ID: ${WORKFLOW_ID}...`);

    for (const key of KEYS) {
        console.log(`\nTesting Key: ${key.substring(0, 10)}...`);

        const payload = {
            workflow_id: WORKFLOW_ID,
            vendor_data: "test_user_key_check",
            callback: "https://example.com/webhook",
            vendor_internal_id: "test_user_key_check"
        };

        try {
            const res = await fetch(URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${key}`
                },
                body: JSON.stringify(payload)
            });

            console.log("Status:", res.status);
            if (res.ok) {
                const data = await res.json();
                console.log("SUCCESS! Key is valid.");
                console.log("Session URL:", data.url);
                return; // Stop after finding working key
            } else {
                console.log("Error:", await res.text());
            }
        } catch (e) { console.error(e); }
    }
}

verify();
