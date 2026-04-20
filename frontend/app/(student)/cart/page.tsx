"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, Home, Truck, MapPin } from "lucide-react";
import { useCart, useSession, useToast } from "@/components/providers";
import { StudentLayout } from "@/components/Layout";
import { client } from "@/lib/api";
import { formatKES } from "@/lib/utils";
import { DeliveryDetailsPayload, Hostel, PaymentModeInfo, ServiceArea, VendorDeliveryLocation } from "@/lib/types";

export default function CartPage() {
  const router = useRouter();
  const { items, clearCart, totalAmount, updateQuantity, vendorId } = useCart();
  const { profile } = useSession();
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [studentName, setStudentName] = useState(profile?.name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [orderType, setOrderType] = useState<"dine_in" | "delivery">("dine_in");
  const [deliveryMode, setDeliveryMode] = useState<"hostel" | "off_campus" | "other">("hostel");
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [deliveryLocations, setDeliveryLocations] = useState<VendorDeliveryLocation[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentModeInfo | null>(null);
  const [hostelId, setHostelId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [serviceAreaId, setServiceAreaId] = useState("");
  const [deliveryLocationId, setDeliveryLocationId] = useState("");
  const [otherLocationName, setOtherLocationName] = useState("");
  const [otherLocationDetails, setOtherLocationDetails] = useState("");
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.name) {
      setStudentName(profile.name);
    }
  }, [profile?.name]);

  useEffect(() => {
    client.hostels().then(setHostels).catch(() => setHostels([]));
    client.serviceAreas().then(setServiceAreas).catch(() => setServiceAreas([]));
    if (profile) {
      client.paymentMode().then(setPaymentMode).catch(() => setPaymentMode(null));
    } else {
      setPaymentMode(null);
    }
  }, [profile]);

  useEffect(() => {
    if (!vendorId || orderType !== "delivery" || deliveryMode !== "off_campus" || !serviceAreaId) {
      setDeliveryLocations([]);
      setDeliveryLocationId("");
      return;
    }

    client
      .vendorDeliveryLocations(vendorId, Number(serviceAreaId))
      .then((locations) => {
        setDeliveryLocations(locations);
        setDeliveryLocationId((current) => current || String(locations.find((location) => location.is_default)?.id ?? locations[0]?.id ?? ""));
      })
      .catch(() => {
        setDeliveryLocations([]);
        setDeliveryLocationId("");
      });
  }, [vendorId, orderType, deliveryMode, serviceAreaId]);

  const resetDeliveryFields = () => {
    setDeliveryError(null);
    setHostelId("");
    setRoomNumber("");
    setServiceAreaId("");
    setDeliveryLocationId("");
    setOtherLocationName("");
    setOtherLocationDetails("");
    setDeliveryLocations([]);
  };

  const buildDeliveryDetails = (): DeliveryDetailsPayload | null => {
    if (orderType !== "delivery") return null;

    if (deliveryMode === "hostel") {
      if (!hostelId || !roomNumber.trim()) {
        setDeliveryError("Select a hostel and enter your room number");
        return null;
      }

      return {
        mode: "hostel",
        hostelId: Number(hostelId),
        roomNumber: roomNumber.trim()
      };
    }

    if (deliveryMode === "other") {
      const placeName = otherLocationName.trim();
      const placeDetails = otherLocationDetails.trim();

      if (!placeName || !placeDetails) {
        setDeliveryError("Share the place name and clear directions for the vendor");
        return null;
      }

      return {
        mode: "other",
        otherLocationName: placeName,
        otherLocationDetails: placeDetails
      };
    }

    if (!serviceAreaId || !deliveryLocationId) {
      setDeliveryError("Select a service area and delivery location");
      return null;
    }

    return {
      mode: "off_campus",
      serviceAreaId: Number(serviceAreaId),
      deliveryLocationId: Number(deliveryLocationId)
    };
  };

  const handleCheckout = async () => {
    if (!profile) {
      router.push("/auth?returnTo=/cart");
      return;
    }

    if (items.length === 0 || !vendorId) return;
    setDeliveryError(null);

    const deliveryDetails = buildDeliveryDetails();
    if (orderType === "delivery" && !deliveryDetails) return;

    setSubmitting(true);
    try {
      const order = await client.checkout({
        vendorId,
        studentName,
        notes,
        orderType,
        deliveryDetails,
        items: items.map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity }))
      });
      clearCart();
      if (order.checkout_url) {
        window.location.assign(order.checkout_url);
        return;
      }

      router.push(`/orders/${order.public_id ?? order.id}`);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Failed to start payment. Please try again.";
      const message = rawMessage.includes("Failed to start payment")
        ? "Could not start payment simulation right now. Please try again in a moment."
        : rawMessage;

      toast({
        title: "Payment could not start",
        description: message,
        tone: "error"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="w-10 h-10 text-primary/40" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground text-sm mb-6">Add food from the marketplace to get started</p>
          <button
            onClick={() => router.push("/")}
            className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Browse food
          </button>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="px-4 pt-4">
        <h1 className="text-2xl font-bold text-foreground mb-1">Your cart</h1>
        <p className="text-sm text-muted-foreground mb-4">
          {profile
            ? `Payment provider: Simulation (${paymentMode?.mode?.toUpperCase() ?? "TEST"} mode). New orders are marked paid immediately.`
            : "Browse freely. Sign in only when you are ready to place the order."}
        </p>

        {profile && paymentMode ? (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-xs font-semibold ${paymentMode.mode === "live" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            Current payment mode: {paymentMode.mode.toUpperCase()} {paymentMode.configured ? "(configured)" : "(not configured)"}
          </div>
        ) : null}

        <div className="space-y-3 mb-5">
          {items.map((item) => (
            <div key={item.menuItemId} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-primary">MEAL</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{formatKES(item.price)} each</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                  className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                >
                  {item.quantity === 1 ? <Trash2 className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
                </button>
                <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                  className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-border p-4 mb-4">
          <label className="block text-sm font-semibold text-foreground mb-1.5">Your name (for pickup)</label>
          <input
            value={studentName}
            onChange={(event) => setStudentName(event.target.value)}
            placeholder={profile ? "Your name" : "Enter your name before checkout"}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          {!profile && <p className="mt-1 text-xs text-muted-foreground">You can fill this now and sign in when you place the order.</p>}
        </div>

        <div className="bg-white rounded-xl border border-border p-4 mb-4">
          <label className="block text-sm font-semibold text-foreground mb-1.5">Special notes (optional)</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            rows={2}
          />
        </div>

        <div className="bg-white rounded-xl border border-border p-4 mb-4 space-y-4">
          <div>
            <p className="block text-sm font-semibold text-foreground mb-2">Order type</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setOrderType("dine_in");
                  setDeliveryMode("hostel");
                  resetDeliveryFields();
                }}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold ${orderType === "dine_in" ? "border-primary bg-orange-50 text-primary" : "border-border bg-white text-foreground"}`}
              >
                Dine-in
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderType("delivery");
                  setDeliveryMode("hostel");
                  setDeliveryError(null);
                }}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold ${orderType === "delivery" ? "border-primary bg-orange-50 text-primary" : "border-border bg-white text-foreground"}`}
              >
                Delivery
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Dine-in uses the vendor business location automatically. For off-campus delivery, use Other only when the place is not listed and the vendor can reasonably reach it.</p>
          </div>

          {orderType === "delivery" ? (
            <div className="space-y-4 border-t border-border pt-4">
              <div>
                <p className="block text-sm font-semibold text-foreground mb-2">Delivery mode</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMode("hostel");
                      setDeliveryError(null);
                      setServiceAreaId("");
                      setDeliveryLocationId("");
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold ${deliveryMode === "hostel" ? "border-primary bg-orange-50 text-primary" : "border-border bg-white text-foreground"}`}
                  >
                    <Home className="h-4 w-4" /> Hostel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMode("off_campus");
                      setDeliveryError(null);
                      setHostelId("");
                      setRoomNumber("");
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold ${deliveryMode === "off_campus" ? "border-primary bg-orange-50 text-primary" : "border-border bg-white text-foreground"}`}
                  >
                    <Truck className="h-4 w-4" /> Off-campus
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMode("other");
                      setDeliveryError(null);
                      setHostelId("");
                      setRoomNumber("");
                      setServiceAreaId("");
                      setDeliveryLocationId("");
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold ${deliveryMode === "other" ? "border-primary bg-orange-50 text-primary" : "border-border bg-white text-foreground"}`}
                  >
                    <MapPin className="h-4 w-4" /> Other
                  </button>
                </div>
              </div>

              {deliveryMode === "hostel" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Select hostel</label>
                    <select
                      value={hostelId}
                      onChange={(event) => setHostelId(event.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                    >
                      <option value="">Choose hostel</option>
                      {hostels.map((hostel) => (
                        <option key={hostel.id} value={hostel.id}>
                          {hostel.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Room number</label>
                    <input
                      value={roomNumber}
                      onChange={(event) => setRoomNumber(event.target.value)}
                      placeholder="e.g. B12"
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              ) : deliveryMode === "off_campus" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Service area</label>
                    <select
                      value={serviceAreaId}
                      onChange={(event) => {
                        setServiceAreaId(event.target.value);
                        setDeliveryLocationId("");
                        setDeliveryError(null);
                      }}
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                    >
                      <option value="">Choose area</option>
                      {serviceAreas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Vendor pickup point</label>
                    <select
                      value={deliveryLocationId}
                      onChange={(event) => setDeliveryLocationId(event.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                      disabled={!serviceAreaId || deliveryLocations.length === 0}
                    >
                      <option value="">{serviceAreaId ? "Choose pickup point" : "Select service area first"}</option>
                      {deliveryLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.label} - {location.location}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-xs text-muted-foreground">Only vendors delivering to the chosen area are shown, and pickup points are limited to that area.</p>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                  <p className="text-sm font-semibold text-amber-900">Other off-campus place</p>
                  <p className="text-xs text-amber-900/80">
                    Use this only when the location is not listed. The vendor will review the place before accepting the order.
                  </p>

                  <label className="block text-sm font-semibold text-foreground">
                    Place name
                    <input
                      value={otherLocationName}
                      onChange={(event) => setOtherLocationName(event.target.value)}
                      placeholder="e.g. Riverside Apartments"
                      className="mt-1 w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-foreground">
                    Delivery details
                    <textarea
                      value={otherLocationDetails}
                      onChange={(event) => setOtherLocationDetails(event.target.value)}
                      placeholder="Landmark, gate, building, room, or instructions"
                      rows={4}
                      className="mt-1 w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </label>
                </div>
              )}
            </div>
          ) : null}

          {deliveryError ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{deliveryError}</p> : null}
        </div>

        <div className="bg-white rounded-xl border border-border p-4 mb-6">
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.menuItemId} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.name} x{item.quantity}</span>
                <span className="text-foreground">{formatKES(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-primary">{formatKES(totalAmount)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={submitting}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold text-base hover:bg-primary/90 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Preparing payment..." : profile ? `Pay ${formatKES(totalAmount)} with M-Pesa` : "Sign in to place order"}
        </button>

        {profile ? (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-bold text-emerald-700">
              M-PESA
            </span>

            <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-bold text-blue-700">
              VISA
            </span>

            <span className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-1 font-bold text-orange-700">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              Mastercard
            </span>

            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-bold text-slate-700">
              SSL Secured
            </span>
          </div>
        ) : null}
      </div>
    </StudentLayout>
  );
}
