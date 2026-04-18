"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { Clock, CheckCircle2, XCircle, Truck, Loader2 } from "lucide-react";
import FanDeliveryModal from "./FanDeliveryModal";

interface ConfessionRequest {
  id: string;
  room_id: string;
  type: string;
  topic: string;
  amount: number;
  status: string;
  delivery_content?: string;
  delivery_media_url?: string;
  fan_name?: string;
  is_anonymous?: boolean;
  created_at: string;
}

interface MyRequestsProps {
  roomId: string | null;
}

const statusConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  pending_approval: { icon: Clock, label: "Pending", color: "text-amber-400" },
  in_progress: { icon: Loader2, label: "In Progress", color: "text-blue-400" },
  delivered: { icon: Truck, label: "Delivered", color: "text-emerald-400" },
  completed: { icon: CheckCircle2, label: "Completed", color: "text-emerald-400" },
  rejected: { icon: XCircle, label: "Declined", color: "text-red-400" },
};

const MyRequests = ({ roomId }: MyRequestsProps) => {
  const { user } = useAuth();
  const supabase = createClient();
  const [requests, setRequests] = useState<ConfessionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ConfessionRequest | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!roomId || !user) return;
    try {
      const res = await fetch(`/api/v1/rooms/${roomId}/confessions/request`);
      const data = await res.json();
      if (data.requests) {
        setRequests(data.requests);
      }
    } catch (e) {
      console.error("Failed to fetch requests", e);
    } finally {
      setLoading(false);
    }
  }, [roomId, user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Realtime subscription for status changes
  useEffect(() => {
    if (!roomId || !user) return;

    const channel = supabase
      .channel("fan-confession-requests")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "confession_requests",
        filter: `fan_id=eq.${user.id}`,
      }, () => { fetchRequests(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, user, fetchRequests]);

  const handleRequestClick = (req: ConfessionRequest) => {
    if (req.status === "delivered" || req.status === "completed") {
      setSelectedRequest(req);
      setShowDeliveryModal(true);
    }
  };

  return (
    <>
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xs font-semibold tracking-wide">My Requests</h2>
          {requests.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{requests.length} total</span>
          )}
        </div>

        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No requests yet</p>
          ) : (
            requests.map((req) => {
              const config = statusConfig[req.status] || statusConfig.pending_approval;
              const StatusIcon = config.icon;
              const isClickable = req.status === "delivered" || req.status === "completed";

              return (
                <div
                  key={req.id}
                  onClick={() => handleRequestClick(req)}
                  className={`flex items-center justify-between p-2 rounded-lg bg-secondary/50 border border-border/50 transition-colors ${isClickable ? "cursor-pointer hover:bg-secondary/80 hover:border-primary/30" : ""
                    }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-8 h-8 rounded-md bg-muted flex items-center justify-center ${config.color}`}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate max-w-[120px]">{req.topic}</p>
                      <p className="text-[10px] text-muted-foreground">{req.type} • {config.label}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-secondary text-xs font-semibold border border-border">
                    <span className="gold-text">€{req.amount}</span>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <FanDeliveryModal
        isOpen={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        request={selectedRequest}
        onAction={fetchRequests}
      />
    </>
  );
};

export default MyRequests;
