import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function test() {
    try {
        // We can't fetch the local next.js server easily without a valid session cookie.
        // If we want to simulate it, we would need to pass a cookie.
        console.log("Since Next.js API route /api/v1/rooms/... uses createClient(server), it reads cookies().");
        console.log("If the client request has no cookies or wrong cookies, auth.getUser() returns null/error.");
        console.log("Then it returns 401 Unauthorized.");
    } catch (e) {
        console.error(e);
    }
}
test();
