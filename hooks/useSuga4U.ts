import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export type ActivityEventType =
    | "ENTRY_FEE"
    | "TIP"
    | "SECRET_UNLOCK"
    | "OFFER_CLAIM"
    | "PAID_REQUEST"
    | "LINK_REVEAL"
    | "BUY_FOR_HER"
    | "CHAT";

export type ActivityEvent = {
    id: string;
    ts: number;
    type: ActivityEventType;
    fanName: string;
    label: string;
    amount: number;
};

export type OfferDrop = {
    id: string;
    title: string;
    description: string;
    price: number;
    totalSlots: number;
    slotsRemaining: number;
    endsAt: number;
    claims: number;
    revenue: number;
};

export type PaidRequest = {
    id: string;
    fanName: string;
    type: string;
    label: string;
    note: string;
    price: number;
    status: string;
    createdAt: number;
};

export function useSuga4U(roomId: string | null) {
    const [activity, setActivity] = useState<ActivityEvent[]>([]);
    const [offers, setOffers] = useState<OfferDrop[]>([]);
    const [requests, setRequests] = useState<PaidRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    const loadData = useCallback(async (rid: string) => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/v1/rooms/${rid}/suga/state`);
            const data = await res.json();

            if (data.offers) {
                setOffers(data.offers.map((o: any) => ({
                    id: o.id,
                    title: o.title,
                    description: o.description,
                    price: Number(o.price),
                    totalSlots: o.total_slots,
                    slotsRemaining: o.slots_remaining,
                    endsAt: new Date(o.ends_at).getTime(),
                    claims: o.claims,
                    revenue: Number(o.revenue)
                })));
            }

            if (data.activity) {
                setActivity(data.activity.map((a: any) => ({
                    id: a.id,
                    ts: new Date(a.created_at).getTime(),
                    type: a.type,
                    fanName: a.fan_name,
                    label: a.label,
                    amount: Number(a.amount)
                })));
            }

            // Requests
            const reqRes = await fetch(`/api/v1/rooms/${rid}/suga/requests`);
            const reqData = await reqRes.json();
            if (reqData.requests) {
                setRequests(reqData.requests.map((r: any) => ({
                    id: r.id,
                    fanName: r.fan_name,
                    type: r.type,
                    label: r.label,
                    note: r.note,
                    price: Number(r.price),
                    status: r.status,
                    createdAt: new Date(r.created_at).getTime()
                })));
            }
        } catch (err) {
            console.error("Failed to load Suga4U data:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!roomId) return;
        loadData(roomId);

        const channel = supabase.channel(`room_${roomId}_suga`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suga_activity_events', filter: `room_id=eq.${roomId}` }, (payload) => {
                const a = payload.new as any;
                setActivity(prev => [{
                    id: a.id,
                    ts: new Date(a.created_at).getTime(),
                    type: a.type,
                    fanName: a.fan_name,
                    label: a.label,
                    amount: Number(a.amount)
                }, ...prev].slice(0, 50));
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suga_paid_requests', filter: `room_id=eq.${roomId}` }, (payload) => {
                const r = payload.new as any;
                setRequests(prev => [{
                    id: r.id,
                    fanName: r.fan_name,
                    type: r.type,
                    label: r.label,
                    note: r.note,
                    price: Number(r.price),
                    status: r.status,
                    createdAt: new Date(r.created_at).getTime()
                }, ...prev]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'suga_paid_requests', filter: `room_id=eq.${roomId}` }, (payload) => {
                const u = payload.new as any;
                setRequests(prev => prev.map(r => r.id === u.id ? { ...r, status: u.status } : r));
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'suga_offer_drops', filter: `room_id=eq.${roomId}` }, (payload) => {
                const u = payload.new as any;
                setOffers(prev => prev.map(o => o.id === u.id ? {
                    ...o,
                    slotsRemaining: u.slots_remaining,
                    claims: u.claims,
                    revenue: Number(u.revenue)
                } : o));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, loadData, supabase]);

    const sendMessage = useCallback(async (text: string, fanName: string) => {
        if (!roomId || !text.trim()) return;
        const { error } = await supabase.from("suga_activity_events").insert({
            room_id: roomId,
            type: "CHAT",
            fan_name: fanName,
            label: text.trim(),
            amount: 0
        });
        if (error) throw error;
    }, [roomId, supabase]);

    const createRequest = useCallback(async (type: string, label: string, note: string, price: number, fanName: string) => {
        if (!roomId) return;
        const res = await fetch(`/api/v1/rooms/${roomId}/suga/requests`, {
            method: 'POST',
            body: JSON.stringify({ type, label, note, price, fanName })
        });
        return await res.json();
    }, [roomId]);

    const claimOffer = useCallback(async (offerId: string) => {
        if (!roomId) return;
        const res = await fetch(`/api/v1/rooms/${roomId}/suga/offers/${offerId}/claim`, {
            method: 'POST'
        });
        return await res.json();
    }, [roomId]);

    const sendGift = useCallback(async (amount: number, fanName: string, label: string = "Gift") => {
        if (!roomId) return;
        const { error } = await supabase.from("suga_activity_events").insert({
            room_id: roomId,
            type: "TIP",
            fan_name: fanName,
            label: label,
            amount: amount
        });
        if (error) throw error;
    }, [roomId, supabase]);

    return {
        activity,
        offers,
        requests,
        isLoading,
        sendMessage,
        createRequest,
        claimOffer,
        sendGift
    };
}
