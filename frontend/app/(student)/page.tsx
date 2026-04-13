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
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [popular, setPopular] = useState<MarketplaceItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState({ totalItems: 0, totalVendors: 0, avgPickupTime: 12 });

  useEffect(() => {
    client.marketplaceFeed(search || undefined, selectedCategory).then((data) => {
      setItems(data.items);
      setStats(data.stats);
    });
  }, [search, selectedCategory]);

  useEffect(() => {
    client.popularMeals().then(setPopular);
    client.categories().then(setCategories);
  }, []);

  return (
    <StudentLayout>
      <div className="px-4 pt-4 pb-2 bg-white">
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
            placeholder="Search food..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="overflow-x-auto flex gap-2 px-4 py-3 bg-white border-b border-border scrollbar-none">
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

      <div className="px-4 py-4">
        {!search && !selectedCategory && popular.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base text-foreground">Popular today</h2>
              <span className="text-xs text-primary font-semibold">Trending</span>
            </div>
            <div className="overflow-x-auto flex gap-3 pb-2 scrollbar-none -mx-4 px-4">
              {popular.map((item) => (
                <div key={item.id} className="flex-shrink-0 w-44">
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
                    pickupTimeMin={item.pickup_time_min}
                    pickupTimeMax={item.pickup_time_max}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base text-foreground">
            {search ? `Results for "${search}"` : selectedCategory ? selectedCategory : "All food"}
          </h2>
          <span className="text-xs text-muted-foreground">{items.length} items</span>
        </div>

        {items.length === 0 ? (
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
          <div className="grid grid-cols-2 gap-3">
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
                pickupTimeMin={item.pickup_time_min}
                pickupTimeMax={item.pickup_time_max}
              />
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
