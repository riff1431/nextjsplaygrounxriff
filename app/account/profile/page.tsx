"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function AccountProfileRedirect() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const redirectUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                router.push(`/profile/${user.id}`);
            } else {
                router.push("/auth");
            }
        };

        redirectUser();
    }, [router, supabase]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-pink-500 animate-pulse">Redirecting to your profile...</div>
        </div>
    );
}
