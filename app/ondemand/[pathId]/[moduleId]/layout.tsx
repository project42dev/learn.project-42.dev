"use client";

import { RequireAuth } from "../../../components/RequireAuth";

export default function OnDemandLessonLayout({ children }: { children: React.ReactNode }) {
    return <RequireAuth>{children}</RequireAuth>;
}
