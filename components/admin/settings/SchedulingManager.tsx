"use strict";
import React, { useState } from "react";
import { Timer, Calendar, Plus } from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle, AdminTable } from "../shared/AdminTable";
import { AdminPill } from "../shared/AdminPill";

// Mock data for now, could be connected to a 'scheduled_tasks' table later
const MOCK_TASKS = [
    { id: "SCH-001", task: "Weekly Payout Run", time: "2026-01-25 00:00:00", status: "pending", type: "system" },
    { id: "SCH-002", task: "Database Backup", time: "2026-01-21 03:00:00", status: "pending", type: "maintenance" },
    { id: "SCH-003", task: "Subscription Renewals", time: "2026-01-21 00:00:00", status: "completed", type: "system" },
];

export default function SchedulingManager() {
    const [tasks, setTasks] = useState(MOCK_TASKS);

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<Timer className="w-4 h-4" />}
                title="System Scheduling"
                sub="Manage automated tasks and maintenance windows."
                right={<NeonButton variant="blue"><Plus className="w-4 h-4 mr-1" /> New Task</NeonButton>}
            />

            <div className="mt-4">
                <AdminTable
                    columns={[
                        { key: "id", label: "Task ID", w: "100px" },
                        { key: "task", label: "Task Name" },
                        { key: "type", label: "Type", w: "120px" },
                        { key: "time", label: "Scheduled Time", w: "160px" },
                        { key: "status", label: "Status", w: "120px", right: true },
                    ]}
                    rows={tasks.map((t) => ({
                        id: <span className="font-mono text-[10px] text-gray-400">{t.id}</span>,
                        task: <span className="text-white font-medium">{t.task}</span>,
                        type: <AdminPill tone="cyan">{t.type}</AdminPill>,
                        time: new Date(t.time).toLocaleString(),
                        status: t.status === 'completed' ? <AdminPill tone="green">Completed</AdminPill> : <AdminPill tone="amber">Pending</AdminPill>,
                    }))}
                />
            </div>
        </NeonCard>
    );
}
