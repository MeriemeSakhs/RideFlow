import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Plus } from "lucide-react";
import PortalLayout from "../layout/PortalLayout";
import Modal from "../ui/Modal";
import ConfirmDialog from "../ui/ConfirmDialog";
import DriversTable from "../drivers/DriversTable";
import { MANAGER_NAV_ITEMS } from "../../portalConfig";
import getUserInfo from "../../utilities/decodeJwt";
import { authHeader, errorMessageFrom } from "../../utilities/api";

const DRIVERS_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/driver`;
const inputClass = "w-full px-4 py-2 rounded-md border border-rideflow-navy/20 text-rideflow-navy focus:outline-none focus:ring-2 focus:ring-rideflow-orange focus:border-rideflow-orange";
const emptyDriverForm = { name: "", phone: "", licenseNumber: "", smsConsent: false };

// Only Add + view exist here - there's no update-driver endpoint yet, so
// selecting a driver shows their details rather than an edit form.
const ManagerDrivers = () => {
  const [user, setUser] = useState(undefined);
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [selectedDriver, setSelectedDriver] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [formData, setFormData] = useState(emptyDriverForm);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [removingId, setRemovingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null);

  const [consentSaving, setConsentSaving] = useState(false);
  const [consentError, setConsentError] = useState("");

  const fetchDrivers = useCallback(async () => {
    setIsLoading(true);
    setListError("");
    try {
      const { data } = await axios.get(DRIVERS_URL, { headers: authHeader() });
      setDrivers(data);
    } catch (err) {
      setListError(errorMessageFrom(err, "Could not load drivers. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = getUserInfo();
    setUser(currentUser);
    if (currentUser && currentUser.role === "manager") fetchDrivers();
  }, [fetchDrivers]);

  const handleChange = ({ currentTarget: input }) => {
    setFormData((prev) => ({ ...prev, [input.name]: input.type === "checkbox" ? input.checked : input.value }));
  };

  const selectDriver = (driver) => {
    setConsentError("");
    setSelectedDriver(driver);
  };

  const updateSmsConsent = async (smsConsent) => {
    setConsentError("");
    setConsentSaving(true);
    try {
      const { data } = await axios.patch(`${DRIVERS_URL}/${selectedDriver._id}/sms-consent`, { smsConsent }, { headers: authHeader() });
      setSelectedDriver(data);
      setDrivers((prev) => prev.map((d) => (d._id === data._id ? data : d)));
    } catch (err) {
      setConsentError(errorMessageFrom(err, "Could not update SMS consent. Please try again."));
    } finally {
      setConsentSaving(false);
    }
  };

  const openAdd = () => {
    setFormData(emptyDriverForm);
    setFormError("");
    setAddOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) return setFormError("Driver name is required");
    if (!/^\+[1-9]\d{6,14}$/.test(formData.phone.trim())) {
      return setFormError("Phone number must be in E.164 format, e.g. +15551234567");
    }
    if (!formData.licenseNumber.trim()) return setFormError("License number is required");

    setIsSubmitting(true);
    try {
      await axios.post(DRIVERS_URL, formData, { headers: authHeader() });
      setAddOpen(false);
      await fetchDrivers();
    } catch (err) {
      setFormError(errorMessageFrom(err, "Could not add this driver. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clicking Delete only opens the confirmation dialog - nothing is
  // deleted until the dialog's own Delete button is explicitly clicked.
  const handleRemove = (driver) => setConfirmTarget(driver);

  const cancelRemove = () => setConfirmTarget(null);

  const confirmRemove = async () => {
    const driver = confirmTarget;
    setActionError("");
    setRemovingId(driver._id);
    try {
      await axios.patch(`${DRIVERS_URL}/${driver._id}/remove`, {}, { headers: authHeader() });
      setConfirmTarget(null);
      await fetchDrivers();
    } catch (err) {
      setActionError(errorMessageFrom(err, "Could not delete driver. Please try again."));
      setConfirmTarget(null);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <PortalLayout portalTitle="Manager Portal" portalSubtitle="Monitor operations and view analytics" navItems={MANAGER_NAV_ITEMS} user={user}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-rideflow-navy/60">Manage your fleet drivers</p>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <Plus size={16} /> Add New Driver
        </button>
      </div>

      {isLoading && <p className="text-rideflow-navy/60">Loading drivers...</p>}
      {!isLoading && listError && <p className="text-red-600 text-sm mb-4">{listError}</p>}
      {!isLoading && !listError && (
        <>
          <DriversTable drivers={drivers} onSelect={selectDriver} onRemove={handleRemove} removingId={removingId} />
          {actionError && <p className="text-red-600 text-xs mt-2">{actionError}</p>}
        </>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Driver">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              placeholder="+15551234567"
              value={formData.phone}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">License Number</label>
            <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange} className={inputClass} />
          </div>
          <div className="rounded-lg border border-rideflow-navy/15 bg-rideflow-navy/[0.03] px-3 py-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="smsConsent"
                checked={formData.smsConsent}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 shrink-0 accent-rideflow-orange"
              />
              <span className="text-xs text-rideflow-navy/80 leading-relaxed">
                <span className="font-semibold text-rideflow-navy">Optional:</span> The driver has agreed to receive ride assignment
                text messages from RideFlow at this phone number, including new ride requests with a link to confirm or decline.
                Message frequency varies based on ride activity. Message and data rates may apply. Reply HELP for help, STOP to opt out.
                Consent is optional and is not required to add a driver.
              </span>
            </label>
          </div>
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover disabled:opacity-50 text-white font-semibold transition-colors shadow-sm"
          >
            {isSubmitting ? "Adding..." : "Add Driver"}
          </button>
        </form>
      </Modal>

      <Modal open={!!selectedDriver} onClose={() => setSelectedDriver(null)} title="Driver Details">
        {selectedDriver && (
          <div className="space-y-2 text-sm">
            <p><span className="text-rideflow-navy/60">Name:</span> <span className="font-semibold text-rideflow-navy">{selectedDriver.name}</span></p>
            <p><span className="text-rideflow-navy/60">Phone:</span> {selectedDriver.phone}</p>
            <p><span className="text-rideflow-navy/60">License Number:</span> {selectedDriver.licenseNumber}</p>
            <p><span className="text-rideflow-navy/60">Status:</span> <span className="capitalize">{selectedDriver.status}</span></p>
            <p>
              <span className="text-rideflow-navy/60">SMS Notifications:</span>{" "}
              {selectedDriver.smsConsent
                ? `Opted in${selectedDriver.smsConsentAt ? ` on ${new Date(selectedDriver.smsConsentAt).toLocaleDateString()}` : ""}`
                : "Not opted in (ride requests will not be texted)"}
            </p>
            {selectedDriver.status !== "removed" && (
              <button
                type="button"
                disabled={consentSaving}
                onClick={() => updateSmsConsent(!selectedDriver.smsConsent)}
                className="mt-2 px-3 py-1.5 rounded-md border border-rideflow-navy/20 text-rideflow-navy text-xs font-semibold hover:bg-rideflow-navy/5 disabled:opacity-50"
              >
                {consentSaving ? "Saving..." : selectedDriver.smsConsent ? "Withdraw SMS consent" : "Record driver's SMS consent"}
              </button>
            )}
            {consentError && <p className="text-red-600 text-xs">{consentError}</p>}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmTarget}
        title="Delete Driver?"
        message={
          confirmTarget
            ? `Are you sure you want to delete ${confirmTarget.name}? They will no longer be assignable to new rides, but any ride history referencing them is unaffected.`
            : ""
        }
        isConfirming={removingId === confirmTarget?._id}
        onConfirm={confirmRemove}
        onCancel={cancelRemove}
      />
    </PortalLayout>
  );
};

export default ManagerDrivers;
