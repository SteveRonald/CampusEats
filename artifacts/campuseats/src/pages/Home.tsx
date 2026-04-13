import { useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { FoodCard } from "@/components/FoodCard";
import { StudentLayout } from "@/components/Layout";
import {
  useGetMarketplaceFeed,
  useGetPopularItems,
  useGetCategories,
  useGetMarketplaceStats,
} from "@workspace/api-client-react";

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  const { data: feedData, isLoading: feedLoading } = useGetMarketplaceFeed(
    { category: selectedCategory, search: search || undefined, limit: 40 },
    { query: { refetchInterval: 30000 } },
  );

  const { data: popular } = useGetPopularItems();
  const { data: categories } = useGetCategories();
  const { data: stats } = useGetMarketplaceStats();

  const items = feedData?.items ?? [];

  return (
    <StudentLayout>
      {/* Hero / search bar */}
      <div className="px-4 md:px-8 pt-6 pb-3 bg-white border-b border-border">
        <div className="max-w-4xl">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">What are you hungry for?</h1>
          {stats && (
            <p className="text-sm text-muted-foreground mt-1">
              {stats.totalItems} items from {stats.totalVendors} vendors · {stats.avgPickupTime} min avg pickup
            </p>
          )}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search food..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:max-w-md pl-10 pr-4 py-2.5 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <div className="overflow-x-auto flex gap-2 px-4 md:px-8 py-3 bg-white border-b border-border scrollbar-none">
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !selectedCategory ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? undefined : cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedCategory === cat ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 md:px-8 py-6">
        {/* Popular Today */}
        {!search && !selectedCategory && popular && popular.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-foreground">Popular today</h2>
              <span className="text-xs text-primary font-semibold">Trending</span>
            </div>
            {/* Mobile: horizontal scroll; Desktop: grid */}
            <div className="md:hidden overflow-x-auto flex gap-3 pb-2 scrollbar-none -mx-4 px-4">
              {popular.map((item) => (
                <div key={item.id} className="flex-shrink-0 w-44">
                  <FoodCard
                    id={item.id}
                    name={item.name}
                    description={item.description}
                    price={item.price}
                    category={item.category}
                    imageUrl={item.imageUrl}
                    isAvailable={item.isAvailable}
                    vendorId={item.vendorId}
                    vendorName={item.vendor?.stallName ?? ""}
                    pickupTimeMin={item.vendor?.pickupTimeMin}
                    pickupTimeMax={item.vendor?.pickupTimeMax}
                  />
                </div>
              ))}
            </div>
            <div className="hidden md:grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {popular.map((item) => (
                <FoodCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  description={item.description}
                  price={item.price}
                  category={item.category}
                  imageUrl={item.imageUrl}
                  isAvailable={item.isAvailable}
                  vendorId={item.vendorId}
                  vendorName={item.vendor?.stallName ?? ""}
                  pickupTimeMin={item.vendor?.pickupTimeMin}
                  pickupTimeMax={item.vendor?.pickupTimeMax}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Items */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-foreground">
            {search ? `Results for "${search}"` : selectedCategory ? selectedCategory : "All food"}
          </h2>
          {feedData && <span className="text-sm text-muted-foreground">{feedData.total} items</span>}
        </div>

        {feedLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-border animate-pulse">
                <div className="h-36 bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="font-bold text-lg text-foreground mb-1">No items found</h3>
            <p className="text-sm text-muted-foreground">Try a different search or category</p>
            <button
              onClick={() => { setSearch(""); setSelectedCategory(undefined); }}
              className="mt-4 flex items-center gap-1.5 mx-auto text-primary text-sm font-semibold"
            >
              <RefreshCw className="w-4 h-4" /> Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((item) => (
              <FoodCard
                key={item.id}
                id={item.id}
                name={item.name}
                description={item.description}
                price={item.price}
                category={item.category}
                imageUrl={item.imageUrl}
                isAvailable={item.isAvailable}
                vendorId={item.vendorId}
                vendorName={item.vendor?.stallName ?? ""}
                pickupTimeMin={item.vendor?.pickupTimeMin}
                pickupTimeMax={item.vendor?.pickupTimeMax}
              />
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
