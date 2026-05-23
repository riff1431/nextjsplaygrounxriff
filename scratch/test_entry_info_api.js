// test_entry_info_api.js
async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/v1/rooms/entry-info?room_type=suga-4-u');
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}
run();
