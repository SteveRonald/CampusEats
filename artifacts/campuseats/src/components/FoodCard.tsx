import { Plus, Clock } from "lucide-react";
import { useCart } from "@/context/CartContext";
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
  pickupTimeMin?: number | null;
  pickupTimeMax?: number | null;
}

export function FoodCard({
  id,
  name,
  description,
  price,
  imageUrl,
  isAvailable,
  vendorId,
  vendorName,
  pickupTimeMin = 10,
  pickupTimeMax = 15,
}: FoodCardProps) {
  const { addItem } = useCart();

  const handleAdd = () => {
    addItem({
      menuItemId: id,
      name,
      price: Number(price),
      vendorId,
      vendorName,
      imageUrl,
    });
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border flex flex-col">
      <div className="relative">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-36 object-cover" />
        ) : (
          <div className="w-full h-36 bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
            <span className="text-4xl">🍽️</span>
          </div>
        )}
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">Unavailable</span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-[11px] text-primary font-semibold uppercase tracking-wide mb-0.5">{vendorName}</p>
        <h3 className="font-bold text-sm text-foreground leading-tight">{name}</h3>
        {description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <div>
            <span className="font-bold text-foreground text-sm">{formatKES(price)}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{pickupTimeMin}–{pickupTimeMax} min</span>
            </div>
          </div>
          {isAvailable && (
            <button
              onClick={handleAdd}
              className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
