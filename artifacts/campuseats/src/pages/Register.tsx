import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateUser, useLoginUser } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { ChefHat } from "lucide-react";

export default function Register() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "student" as "student" | "vendor" | "admin" });
  const [error, setError] = useState("");

  const createUser = useCreateUser();
  const loginUser = useLoginUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await createUser.mutateAsync({ data: form });
      const result = await loginUser.mutateAsync({ data: { email: form.email, password: form.password } });
      login(result.user as Parameters<typeof login>[0], result.token);
      if (result.user.role === "vendor") navigate("/vendor/dashboard");
      else if (result.user.role === "admin") navigate("/admin/dashboard");
      else navigate("/");
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 max-w-md mx-auto">
      <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        <ChefHat className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-2xl font-black text-foreground mb-1">Create account</h1>
      <p className="text-muted-foreground text-sm mb-8">Join CampusEats today</p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
        {[
          { key: "name", label: "Full name", placeholder: "John Doe", type: "text" },
          { key: "email", label: "Email", placeholder: "your@email.com", type: "email" },
          { key: "phone", label: "Phone (M-Pesa)", placeholder: "07XX XXX XXX", type: "tel" },
          { key: "password", label: "Password", placeholder: "Min 6 characters", type: "password" },
        ].map(({ key, label, placeholder, type }) => (
          <div key={key}>
            <label className="block text-sm font-semibold text-foreground mb-1.5">{label}</label>
            <input
              type={type}
              value={(form as Record<string, string>)[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              placeholder={placeholder}
              required={key !== "phone"}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            />
          </div>
        ))}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">I am a</label>
          <div className="grid grid-cols-2 gap-2">
            {[{ value: "student", label: "Student" }, { value: "vendor", label: "Vendor" }].map(({ value, label }) => (
              <button
                type="button"
                key={value}
                onClick={() => setForm({ ...form, role: value as "student" | "vendor" })}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  form.role === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-white text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={createUser.isPending || loginUser.isPending}
          className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-base hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
        >
          {createUser.isPending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <button onClick={() => navigate("/login")} className="text-primary font-semibold hover:underline">
          Sign in
        </button>
      </p>
    </div>
  );
}
