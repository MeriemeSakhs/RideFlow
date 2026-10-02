import React from "react";
import Modal from "./Modal";

// Reusable confirmation dialog for destructive actions (delete/remove/
// cancel) across RideFlow, built on the existing Modal component so every
// confirmation shares the same look/behavior rather than each page
// reimplementing its own. Nothing destructive happens until the user
// explicitly clicks the confirm button - closing the dialog any other way
// (backdrop click, the X, or Cancel) all route to onCancel and make no
// changes, since Modal's own onClose already covers backdrop/X.
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isConfirming = false,
  confirmingLabel = "Deleting...",
  onConfirm,
  onCancel,
}) => (
  <Modal open={open} onClose={onCancel} title={title}>
    <div className="space-y-5">
      <p className="text-sm text-rideflow-navy/70">{message}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-lg border border-rideflow-navy/20 text-rideflow-navy hover:bg-rideflow-gray/40 transition-colors font-semibold"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isConfirming}
          className="flex-1 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover disabled:opacity-50 text-white font-semibold transition-colors shadow-sm"
        >
          {isConfirming ? confirmingLabel : confirmLabel}
        </button>
      </div>
    </div>
  </Modal>
);

export default ConfirmDialog;
