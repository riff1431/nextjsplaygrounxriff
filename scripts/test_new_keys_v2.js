
const KEYS = [
    "eG-rjmIaALHe-AHVYPSAF1El14nh2MKubK_4Yh5bZro",
    "V6uft53PvQ02qIoupazgFzUJNzerSim-8McEL530HMs"
];

const WORKFLOWS = [
    "94398e9e-4550-4d64-9947-f58173fa8c3d", // From screenshot
    "cb1b9ad7-d99f-435e-ac37-f09b950b256a"  // User provided "APP ID"
];

const ENDPOINTS = [
    "https://verification.didit.me/v3/session/",
    "https://apx.didit.me/auth/v3/sessions/",
    "https://api.didit.me/v3/session/"
];

async function verify() {
    console.log(`Starting Comprehensive Auth Test...`);

    for (const key of KEYS) {
        console.log(`\n=== Testing Key: ${key.substring(0, 5)}... ===`);

        for (const url of ENDPOINTS) {
            for (const wf of WORKFLOWS) {
                // Construct payload based on endpoint type guess
                // verification.didit.me usually takes workflow_id
                // apx might differ

                const payload = {
                    workflow_id: wf,
                    vendor_data: "test_user_v2",
                    callback: "https://example.com/webhook",
                    vendor_internal_id: "test_user_v2"
                };

                try {
                    const res = await fetch(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${key}`
                        },
                        body: JSON.stringify(payload)
                    });

                    console.log(`[${url}] [WF:${wf.substring(0, 4)}..] -> ${res.status}`);
                    if (res.ok) {
                        const data = await res.json();
                        console.log("SUCCESS!", data);
                        return;
                    } else if (res.status !== 404 && res.status !== 401 && res.status !== 403) {
                        // Log interesting errors that aren't strict auth failures
                        // console.log(await res.text());
                    }
                } catch (e) { }
            }
        }
    }
}

verify();
