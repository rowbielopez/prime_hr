import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

client
    .from("campuses")
    .select("id, name, code")
    .order("name")
    .then(({ data, error }) => {
        if (error) { console.error(error.message); process.exit(1); }
        console.log(JSON.stringify(data, null, 2));
    });
