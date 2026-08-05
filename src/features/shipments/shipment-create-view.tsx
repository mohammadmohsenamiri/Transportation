"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { ShipmentForm, emptyShipmentFormValues, formValuesToPayload, extractShipmentFieldErrors } from "@/features/shipments/shipment-form";
import { useCreateShipment } from "@/features/shipments/use-shipment-queries";

export function ShipmentCreateView() {
  const router = useRouter();
  const [values, setValues] = useState(emptyShipmentFormValues());
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const createMutation = useCreateShipment();

  async function handleSubmit() {
    setServerError(null);
    setFieldErrors({});
    try {
      const created = await createMutation.mutateAsync(formValuesToPayload(values));
      router.push(`/shipments/${created.id}`);
    } catch (error) {
      const { message, fieldErrors: errors } = extractShipmentFieldErrors(error);
      setFieldErrors(errors);
      if (Object.keys(errors).length === 0) setServerError(message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push("/shipments")}
          aria-label="بازگشت به فهرست مرسوله‌ها"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
        >
          <Icon name="chevron-left" className="h-5 w-5 rotate-180" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">مرسوله جدید</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">مبدأ، مقصد و مشخصات مرسوله را تعیین کنید</p>
        </div>
      </div>

      <ShipmentForm
        mode="create"
        values={values}
        onChange={setValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/shipments")}
        pending={createMutation.isPending}
        serverError={serverError}
        fieldErrors={fieldErrors}
      />
    </div>
  );
}
