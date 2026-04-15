"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ToggleLeft, ToggleRight, Search, ShieldAlert } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", {
        headers: { "x-api-key": process.env.NEXT_PUBLIC_API_SECRET || "" }
      });
      if (res.ok) {
        setSession(true);
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        setSession(false);
      }
    } catch {
      setSession(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.NEXT_PUBLIC_API_SECRET || "" },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      fetchUsers();
    } else {
      setLoginErr("Invalid credentials");
    }
  };

  const toggleVerified = async (id: string, currentStatus: boolean) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.NEXT_PUBLIC_API_SECRET || "" },
      body: JSON.stringify({ id, verified: !currentStatus })
    });
    if (res.ok) {
      setUsers(u => u.map(user => user._id === id ? { ...user, verified: !currentStatus } : user));
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background text-foreground relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>

        <form onSubmit={handleLogin} className="w-full max-w-sm p-8 space-y-6 glass border-border/50 rounded-[2rem] shadow-2xl relative z-10 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
          
          <div className="flex flex-col items-center gap-3">
            <div className="h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-lg shadow-primary/10">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Portail Administrateur</h1>
            <p className="text-sm font-medium text-muted-foreground/80 text-center px-4 leading-relaxed">
              Connectez-vous pour gérer les accès et les utilisateurs.
            </p>
          </div>
          
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Identifiant</label>
              <input 
                value={username} onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border bg-background/50 focus:bg-background text-sm focus:ring-2 focus:ring-primary/50 outline-none transition shadow-sm font-medium placeholder:text-muted-foreground/50" 
                placeholder="Ex: admin" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Mot de passe</label>
              <input 
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border bg-background/50 focus:bg-background text-sm focus:ring-2 focus:ring-primary/50 outline-none transition shadow-sm font-medium placeholder:text-muted-foreground/50" 
                placeholder="••••••••" 
              />
            </div>
          </div>
          {loginErr && <p className="text-sm font-bold text-red-500 bg-red-500/10 p-3 rounded-xl text-center border border-red-500/20">{loginErr}</p>}
          <div className="pt-2">
            <button type="submit" className="w-full bg-primary text-primary-foreground h-14 rounded-xl text-base font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
              Se connecter
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">User Management</h1>
              <p className="text-sm text-muted-foreground">Approve accounts before they can command.</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-muted/20">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search users..." className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary/40 outline-none" />
            </div>
          </div>
          <div className="divide-y">
            {users.map(u => (
              <div key={u._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/10 transition">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 bg-accent rounded-full border flex items-center justify-center font-bold text-sm text-muted-foreground">
                    {u.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{u.name || "Unknown"}</span>
                    <span className="text-xs text-muted-foreground">{u.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1 ${u.verified ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                    {u.verified ? "Verified" : "Pending"}
                  </span>
                  <button onClick={() => toggleVerified(u._id, u.verified)} className="text-muted-foreground hover:text-foreground transition hover:scale-105 active:scale-95">
                    {u.verified ? <ToggleRight className="text-green-500 h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No users found. Users must login first.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
