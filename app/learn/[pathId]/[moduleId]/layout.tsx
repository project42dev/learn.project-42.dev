"use client";

import { RequireAuth } from "../../../components/RequireAuth";

export default function ModuleLayout({ children }: { children: React.ReactNode }) {
    return <RequireAuth>{children}</RequireAuth>;
}
