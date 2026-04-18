"use client";

import { MapPin, Search, ShieldCheck, ToggleLeft, ToggleRight, ShieldAlert, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useUser, SignedIn, SignedOut, SignIn, useClerk } from "@clerk/nextjs";

type SiteItem = { slug: string; name: string; };

const ROLES = [
  { value: "employee", label: "Employé", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  { value: "manager", label: "Manager", color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "admin", label: "Admin", color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
];

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  
  const [isAdminAuth, setIsAdminAuth] = useState<boolean | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSite, setFilterSite] = useState("");
  const [sites, setSites] = useState<SiteItem[]>([]);

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
      // The clerk __session cookie is automatically sent by the browser
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        setIsAdminAuth(true);
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        setIsAdminAuth(false);
      }
    } catch {
      setIsAdminAuth(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      fetchUsers();
    } else if (isLoaded && !user) {
      setLoading(false);
    }
  }, [isLoaded, user]);

  const toggleVerified = async (id: string, currentStatus: boolean) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, verified: !currentStatus })
    });
    if (res.ok) {
      setUsers(u => u.map(user => user._id === id ? { ...user, verified: !currentStatus } : user));
    }
  };

  const updateUserSite = async (id: string, site: string) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, site })
    });
    if (res.ok) {
      setUsers(u => u.map(user => user._id === id ? { ...user, site } : user));
    }
  };

  const updateUserRole = async (id: string, role: string) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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

  if (loading || !isLoaded) return <div className="p-10 text-center flex h-screen items-center justify-center text-muted-foreground font-medium">Chargement du portail...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <SignedOut>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>
          <SignIn routing="hash" />
        </div>
      </SignedOut>

      <SignedIn>
        {isAdminAuth === false ? (
          <div className="flex min-h-screen items-center justify-center p-4 relative">
             <div className="absolute inset-0 bg-red-500/5 blur-[100px] pointer-events-none"></div>
             <div className="w-full max-w-md p-8 glass border-border/50 rounded-[2rem] shadow-2xl text-center space-y-6">
               <div className="mx-auto h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                  <ShieldAlert className="h-10 w-10" />
               </div>
               <div>
                  <h1 className="text-2xl font-bold tracking-tight mb-2">Accès Refusé</h1>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Vous n'avez pas les privilèges administrateur pour accéder à ce portail. 
                    Si vous pensez qu'il s'agit d'une erreur, contactez le support.
                  </p>
               </div>
               <button 
                 onClick={() => signOut()}
                 className="w-full h-12 rounded-xl bg-muted hover:bg-muted/80 font-bold transition flex items-center justify-center gap-2"
               >
                 <LogOut className="h-4 w-4" /> Se déconnecter
               </button>
             </div>
          </div>
        ) : (
          <div className="p-4 sm:p-8">
            <div className="max-w-6xl mx-auto space-y-6 relative z-10">
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
                <button 
                   onClick={() => signOut()}
                   className="h-10 px-4 rounded-xl font-bold text-sm bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition flex items-center gap-2"
                 >
                   <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Quitter</span>
                </button>
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
                    <div key={u._id} className="flex flex-col xl:flex-row xl:items-center justify-between p-4 gap-4 hover:bg-muted/10 transition">
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
        )}
      </SignedIn>
    </div>
  );
}
