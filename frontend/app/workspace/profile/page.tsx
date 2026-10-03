import ProfileEditor from "@/components/ProfileEditor";

export default function WorkspaceProfilePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--ink)]">My Profile</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Update your details.</p>
      </div>
      <ProfileEditor />
    </div>
  );
}
