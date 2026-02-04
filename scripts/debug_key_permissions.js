
const API_KEY = "eG-rjmIaALHe-AHVYPSAF1El14nh2MKubK_4Yh5bZro";
const URL = "https://verification.didit.me/v3/session/";

async function testPermissions() {
    console.log(`Testing Key Permissions (List Sessions)...`);

    try {
        const res = await fetch(URL, {
            method: "GET", // LIST sessions
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY
            }
        });

        console.log(`GET ${URL} -> Status: ${res.status}`);
        if (res.ok) {
            console.log("SUCCESS! Key has READ access.");
            const data = await res.json();
            console.log("Sessions found:", data.items ? data.items.length : data);
        } else {
            console.log("Error:", await res.text());
        }
    } catch (e) { console.error(e); }
}

testPermissions();
