"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import type { CustomerDTO } from "@/app/actions/customers";
import { CustomerDialog } from "@/components/quote/customer-form";
import { Button } from "@/components/ui/button";

export function NewCustomerButton({ tiers }: { tiers: { key: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nuevo cliente
      </Button>
      {open && <CustomerDialog open onOpenChange={setOpen} tiers={tiers} onSaved={() => router.refresh()} />}
    </>
  );
}

export function EditCustomerButton({ tiers, customer }: { tiers: { key: string; label: string }[]; customer: CustomerDTO }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label={`Editar ${customer.company || customer.name}`}>
        <Pencil className="h-3.5 w-3.5" /> Editar
      </Button>
      {open && <CustomerDialog open onOpenChange={setOpen} tiers={tiers} initial={customer} onSaved={() => router.refresh()} />}
    </>
  );
}
