import { useState } from "react";
import { useLocation } from "wouter";
import { useLoginUser, useListVendors } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { ChefHat, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = useLoginUser();
  const { data: vendors } = useListVendors({ query: {} });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const result = await loginMutation.mutateAsync({ data: { email, password } });
      login(result.user as Parameters<typeof login>[0], result.token);
      if (result.user.role === "vendor") {
        navigate("/vendor/dashboard");
      } else if (result.user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/");
      }
    } catch {
      setError("Invalid email or password");
    }
  };

  const fillDemo = (role: "student" | "vendor" | "admin") => {
    if (role === "student") { setEmail("student@moi.ac.ke"); setPassword("demo123"); }
    if (role === "vendor") { setEmail("mama@moi.ac.ke"); setPassword("demo123"); }
    if (role === "admin") { setEmail("admin@campuseats.co.ke"); setPassword("admin123"); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 max-w-md mx-auto">
      <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        <ChefHat className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-3xl font-black text-foreground mb-1">CampusEats</h1>
      <p className="text-muted-foreground text-sm mb-8">Campus food, delivered fast</p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-border rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-base hover:bg-primary/90 active:scale-[0.99] transition-all shadow-md disabled:opacity-50"
        >
          {loginMutation.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-6 w-full">
        <p className="text-xs text-muted-foreground text-center mb-3 font-semibold uppercase tracking-wider">Try demo accounts</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { role: "student" as const, label: "Student", color: "bg-blue-50 text-blue-700 border-blue-200" },
            { role: "vendor" as const, label: "Vendor", color: "bg-green-50 text-green-700 border-green-200" },
            { role: "admin" as const, label: "Admin", color: "bg-orange-50 text-orange-700 border-orange-200" },
          ].map(({ role, label, color }) => (
            <button
              key={role}
              onClick={() => fillDemo(role)}
              className={`text-xs font-semibold py-2 px-3 rounded-lg border transition-colors ${color}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        New student?{" "}
        <button onClick={() => navigate("/register")} className="text-primary font-semibold hover:underline">
          Create account
        </button>
      </p>
    </div>
  );
}
