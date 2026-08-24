import type { Metadata } from "next";
import { AdminDashboard } from "../../components/AccountDashboard";

export const metadata: Metadata = {
  title: "Settings & Themes — Owner administration",
  description:
    "Configure owner console preferences, themes, layouts, and registration access policy.",
};

export default function AdminSettingsPage() {
  return (
    <main className="page-shell shell">
      <header className="page-hero profile-hero">
        <p className="eyebrow">Owner administration</p>
        <h1>Console Settings &amp; Themes</h1>
        <p>
          Customize theme palettes, UI layouts, and configure tenant registration
          policies.
        </p>
      </header>
      <AdminDashboard view="settings" />
    </main>
  );
}
