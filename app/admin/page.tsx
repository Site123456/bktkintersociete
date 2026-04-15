"use client";

import { MapPin, Search, ShieldAlert, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SiteItem = { slug: string; name: string; };

const ROLES = [
  { value: "employee", label: "Employé", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  { value: "manager", label: "Manager", color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "admin", label: "Admin", color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
];

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSite, setFilterSite] = useState("");
  const [sites, setSites] = useState<SiteItem[]>([]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");

  // Fetch sites from API
  useEffect(() => {
    fetch("/api/sites", {
      headers: { "x-api-key": process.env.NEXT_PUBLIC_API_SECRET || "" }
    }).then(r => r.json()).then(d => {
      if (d.ok && d.sites) setSites(d.sites);
    }).catch(() => { });
  }, []);

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

  const updateUserSite = async (id: string, site: string) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.NEXT_PUBLIC_API_SECRET || "" },
      body: JSON.stringify({ id, site })
    });
    if (res.ok) {
      setUsers(u => u.map(user => user._id === id ? { ...user, site } : user));
    }
  };

  const updateUserRole = async (id: string, role: string) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.NEXT_PUBLIC_API_SECRET || "" },
      body: JSON.stringify({ id, role })
    });
    if (res.ok) {
      setUsers(u => u.map(user => user._id === id ? { ...user, role } : user));
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery ||
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSite = !filterSite || u.site === filterSite;
    return matchesSearch && matchesSite;
  });

  const siteCounts = sites.map(s => ({
    ...s,
    count: users.filter(u => u.site === s.slug).length
  }));

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background text-foreground relative overflow-hidden">
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
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Gestion Utilisateurs</h1>
              <p className="text-sm text-muted-foreground">{users.length} utilisateur{users.length !== 1 ? 's' : ''} enregistré{users.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Site Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {siteCounts.filter(s => s.count > 0).map(s => (
            <button
              key={s.slug}
              onClick={() => setFilterSite(filterSite === s.slug ? "" : s.slug)}
              className={`p-4 rounded-2xl border transition-all text-left ${filterSite === s.slug ? 'bg-primary/10 border-primary/30 shadow-sm' : 'bg-card border-border/50 hover:border-primary/20'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={14} className="text-primary" />
                <span className="text-xs font-bold text-muted-foreground">{s.slug}</span>
              </div>
              <p className="text-sm font-bold truncate">{s.name}</p>
              <p className="text-2xl font-black text-primary mt-1">{s.count}</p>
            </button>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un utilisateur..."
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border bg-background focus:ring-2 focus:ring-primary/40 outline-none"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={filterSite}
                onChange={e => setFilterSite(e.target.value)}
                className="pl-9 pr-8 py-2.5 text-sm rounded-xl border bg-background focus:ring-2 focus:ring-primary/40 outline-none appearance-none"
              >
                <option value="">Tous les sites</option>
                {sites.slice(1).map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Users List */}
          <div className="divide-y">
            {filteredUsers.map(u => (
              <div key={u._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/10 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 bg-accent rounded-full border flex items-center justify-center font-bold text-sm text-muted-foreground">
                    {u.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm truncate">{u.name || "Unknown"}</span>
                    <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Role selector */}
                  <select
                    value={u.role || "employee"}
                    onChange={e => updateUserRole(u._id, e.target.value)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-bold border-0 outline-none cursor-pointer ${ROLES.find(r => r.value === (u.role || "employee"))?.color || ROLES[0].color}`}
                  >
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>

                  {/* Site selector */}
                  <select
                    value={u.site || ""}
                    onChange={e => updateUserSite(u._id, e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-0 outline-none cursor-pointer"
                  >
                    {sites.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                  </select>

                  {/* Verified */}
                  <span className={`text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1 ${u.verified ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                    {u.verified ? "Vérifié" : "En attente"}
                  </span>
                  <button onClick={() => toggleVerified(u._id, u.verified)} className="text-muted-foreground hover:text-foreground transition hover:scale-105 active:scale-95">
                    {u.verified ? <ToggleRight className="text-green-500 h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Aucun utilisateur trouvé.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
