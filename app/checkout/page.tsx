"use client";

import { useRouter } from "next/navigation";
import CheckoutModal from "../../components/CheckoutModal";

export default function CheckoutPage() {
  const router = useRouter();
  return (
    <CheckoutModal
      open
      onClose={() => router.replace("/shop")}
    />
  );
}
