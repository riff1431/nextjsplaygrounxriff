import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

async function run() {
    const { data, error } = await supabase.from('rooms').select('*').eq('type', 'flash-drop');
    console.log("Error:", error);
    console.log("Data length:", data?.length);
    if(data) {
        console.log("Data:", JSON.stringify(data, null, 2));
    }
}
run();
