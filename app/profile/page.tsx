"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function ProfileRedirect() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                router.replace(`/profile/${user.id}`);
            } else {
                router.replace("/auth");
            }
        };
        checkUser();
    }, [router, supabase]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center text-pink-500">
            Redirecting to profile...
        </div>
    );
}
