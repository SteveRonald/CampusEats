"use client";

import { useEffect, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { FoodCard } from "@/components/FoodCard";
import { StudentLayout } from "@/components/Layout";
import { client } from "@/lib/api";
import { MarketplaceItem } from "@/lib/types";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedServiceArea, setSelectedServiceArea] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [popular, setPopular] = useState<MarketplaceItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [serviceAreas, setServiceAreas] = useState<{ id: number; name: string }[]>([]);
  const [stats, setStats] = useState({ totalItems: 0, totalVendors: 0, avgPickupTime: 12 });
  const [error, setError] = useState<string | null>(null);

  const normalizedSearch = search.trim().toLowerCase();
  const inferredCategory = !selectedCategory && normalizedSearch
    ? categories.find((category) => {
        const normalizedCategory = category.toLowerCase();
        return normalizedCategory.includes(normalizedSearch) || normalizedSearch.includes(normalizedCategory);
      })
    : undefined;
  const effectiveCategory = selectedCategory ?? inferredCategory;
  const effectiveSearch = inferredCategory && !selectedCategory ? undefined : search || undefined;

  useEffect(() => {
    setIsLoadingFeed(true);
    client
      .marketplaceFeed(effectiveSearch, effectiveCategory, selectedServiceArea)
      .then((data) => {
        setItems(data.items);
        setStats(data.stats);
        setError(null);
      })
      .catch(() => {
        setItems([]);
        setError("Could not load menu items. Check again later.");
      })
      .finally(() => {
        setIsLoadingFeed(false);
      });
  }, [effectiveSearch, effectiveCategory, selectedServiceArea]);

  useEffect(() => {
    client.popularMeals().then(setPopular).catch(() => setPopular([]));
    client.categories().then(setCategories).catch(() => setCategories([]));
    client.serviceAreas().then(setServiceAreas).catch(() => setServiceAreas([]));
  }, []);

  return (
    <StudentLayout>
      <div className="px-4 pt-4 pb-2 bg-white md:px-6 lg:px-8">
        <div className="mb-3">
          <h1 className="text-2xl font-bold text-foreground">What are you hungry for?</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.totalItems} items from {stats.totalVendors} vendors - {stats.avgPickupTime} min avg pickup
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search food, category, or vendor name..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="overflow-x-auto flex gap-2 px-4 py-3 bg-white border-b border-border scrollbar-none md:px-6 lg:px-8">
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !selectedCategory ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(selectedCategory === category ? undefined : category)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedCategory === category ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {serviceAreas.length > 0 && (
        <div className="px-4 py-3 bg-white border-b border-border md:px-6 lg:px-8">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Delivery area</h3>
            {selectedServiceArea ? (
              <button className="text-xs font-semibold text-primary" onClick={() => setSelectedServiceArea(undefined)}>
                Clear
              </button>
            ) : null}
          </div>
          <div className="overflow-x-auto flex gap-2 scrollbar-none -mx-1 px-1">
            <button
              onClick={() => setSelectedServiceArea(undefined)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                !selectedServiceArea ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              All areas
            </button>
            {serviceAreas.map((area) => (
              <button
                key={area.id}
                onClick={() => setSelectedServiceArea(selectedServiceArea === area.id ? undefined : area.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedServiceArea === area.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {area.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 py-4 md:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!search && !selectedCategory && popular.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base text-foreground">Popular today</h2>
              <span className="text-xs text-primary font-semibold">Trending</span>
            </div>
            <div className="overflow-x-auto flex gap-3 pb-2 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-4 md:overflow-visible">
              {popular.map((item) => (
                <div key={item.id} className="flex-shrink-0 w-44 md:w-auto">
                  <FoodCard
                    id={item.id}
                    name={item.name}
                    description={item.description}
                    price={item.price}
                    category={item.category}
                    imageUrl={item.image_url}
                    isAvailable={item.is_available}
                    vendorId={item.vendor_id}
                    vendorName={item.vendor_name}
                    vendorLogoUrl={item.vendor_image_url}
                    pickupTimeMin={item.pickup_time_min}
                    pickupTimeMax={item.pickup_time_max}
                    vendorAcceptingOrders={item.vendor_accepting_orders ?? true}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base text-foreground">
            {search ? `Results for "${search}"` : effectiveCategory ? effectiveCategory : "All food"}
          </h2>
          <span className="text-xs text-muted-foreground">{items.length} items</span>
        </div>

        {isLoadingFeed ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-primary" />
            <p className="text-sm font-semibold text-foreground">Loading menu...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">MEAL</div>
            <h3 className="font-bold text-foreground mb-1">No items found</h3>
            <p className="text-sm text-muted-foreground">Try a different search or category</p>
            <button
              onClick={() => {
                setSearch("");
                setSelectedCategory(undefined);
              }}
              className="mt-4 flex items-center gap-1.5 mx-auto text-primary text-sm font-semibold"
            >
              <RefreshCw className="w-4 h-4" /> Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <FoodCard
                key={item.id}
                id={item.id}
                name={item.name}
                description={item.description}
                price={item.price}
                category={item.category}
                imageUrl={item.image_url}
                isAvailable={item.is_available}
                vendorId={item.vendor_id}
                vendorName={item.vendor_name}
                vendorLogoUrl={item.vendor_image_url}
                pickupTimeMin={item.pickup_time_min}
                pickupTimeMax={item.pickup_time_max}
                vendorAcceptingOrders={item.vendor_accepting_orders ?? true}
              />
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
