import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AdminPageHeader from "../../../../components/admin/AdminPageHeader";
import AdminShell from "../../../../components/admin/AdminShell";
import CollectionForm from "../../../../components/admin/CollectionForm";
import { requireAdmin } from "../../../../lib/auth";

export default async function NewCollectionPage() {
  await requireAdmin();
  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="NEW SERIES"
        title="Create collection"
        description="Create an ongoing story collection with its own monthly subscription."
        action={<Link className="admin-button" href="/admin/collections"><ArrowLeft size={15} /> Collections</Link>}
      />
      <CollectionForm />
    </AdminShell>
  );
}
