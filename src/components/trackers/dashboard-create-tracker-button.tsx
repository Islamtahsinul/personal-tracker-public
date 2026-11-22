"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackerFormDialog } from "./tracker-form-dialog";

export function DashboardCreateTrackerButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        New Tracker
      </Button>
      <TrackerFormDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
