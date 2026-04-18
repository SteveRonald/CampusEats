"use client";

import { useState } from "react";
import { Plus, Clock } from "lucide-react";
import { useCart } from "@/components/providers";
import { formatKES } from "@/lib/utils";

interface FoodCardProps {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  category: string;
  imageUrl?: string | null;
  isAvailable: boolean;
  vendorId: number;
  vendorName: string;
  vendorLogoUrl?: string | null;
  pickupTimeMin?: number | null;
  pickupTimeMax?: number | null;
}

export function FoodCard({
  id,
  name,
  description,
  price,
  category,
  imageUrl,
  isAvailable,
  vendorId,
  vendorName,
  vendorLogoUrl,
  pickupTimeMin = 10,
  pickupTimeMax = 15
}: FoodCardProps) {
  const { addItem } = useCart();
  const [showDetails, setShowDetails] = useState(false);

  const addToCart = () => {
    addItem({
      menuItemId: id,
      name,
      price: Number(price),
      vendorId,
      vendorName,
      imageUrl: imageUrl ?? null
    });
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowDetails(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setShowDetails(true);
          }
        }}
        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border flex flex-col cursor-pointer"
      >
      <div className="relative">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-36 object-cover" />
        ) : (
          <div className="w-full h-36 bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">MEAL</span>
          </div>
        )}
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">Unavailable</span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <div className="mb-0.5 flex items-center gap-1.5">
          {vendorLogoUrl ? (
            <img src={vendorLogoUrl} alt={`${vendorName} logo`} className="h-4 w-4 rounded-full border border-orange-100 object-cover" />
          ) : (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-100 text-[9px] font-black text-primary">V</span>
          )}
          <p className="text-[11px] text-primary font-semibold uppercase tracking-wide">{vendorName}</p>
        </div>
        <h3 className="font-bold text-sm text-foreground leading-tight">{name}</h3>
        {description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <div>
            <span className="font-bold text-foreground text-sm">{formatKES(price)}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{pickupTimeMin}-{pickupTimeMax} min</span>
            </div>
          </div>
          {isAvailable && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                addToCart();
              }}
              className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      </div>

      {showDetails ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-2 sm:items-center sm:p-4" onClick={() => setShowDetails(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${name} details`}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-base font-black text-[#1F2937]">{name}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">{vendorName}</p>
              </div>
              <button type="button" onClick={() => setShowDetails(false)} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
                Close
              </button>
            </div>

            <div className="space-y-4 p-4">
              {imageUrl ? (
                <img src={imageUrl} alt={name} className="h-56 w-full rounded-xl object-cover" />
              ) : (
                <div className="flex h-56 w-full items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-orange-100">
                  <span className="text-xl font-bold text-primary">MEAL</span>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Description</p>
                <p className="mt-1 text-sm text-[#1F2937]">{description?.trim() ? description : "No description provided for this item."}</p>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><span className="font-semibold text-[#1F2937]">Category:</span> {category}</p>
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><span className="font-semibold text-[#1F2937]">Price:</span> {formatKES(price)}</p>
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><span className="font-semibold text-[#1F2937]">Pickup:</span> {pickupTimeMin}-{pickupTimeMax} min</p>
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><span className="font-semibold text-[#1F2937]">Status:</span> {isAvailable ? "Available" : "Unavailable"}</p>
              </div>

              {isAvailable ? (
                <button
                  type="button"
                  onClick={() => {
                    addToCart();
                    setShowDetails(false);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white"
                >
                  <Plus className="h-4 w-4" /> Add to cart
                </button>
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-500">This item is currently unavailable.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
