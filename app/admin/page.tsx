"use client";

import { MapPin, Search, ShieldCheck, ToggleLeft, ToggleRight, ShieldAlert, LogOut, ArrowLeft, Home, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useUser, SignedIn, SignedOut, SignIn, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
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
               <div className="flex gap-3">
                 <Link href="/" className="flex-1 h-12 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary/20 transition flex items-center justify-center gap-2">
                   <Home className="h-4 w-4" /> Accueil
                 </Link>
                 <button 
                   onClick={() => signOut()}
                   className="flex-1 h-12 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition flex items-center justify-center gap-2"
                 >
                   <LogOut className="h-4 w-4" /> Quitter
                 </button>
               </div>
             </div>
          </div>
        ) : (
          <div className="p-4 sm:p-8 max-w-[1400px] mx-auto relative z-10">
            {/* Top Navigation / Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 mt-4">
              <div className="flex items-center gap-4">
                <Link href="/" className="h-12 w-12 bg-white/50 dark:bg-black/50 backdrop-blur-xl border border-border/50 hover:bg-muted rounded-2xl flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm hover:shadow-md transition-all">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-purple-600/30 border border-white/10">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tighter">Portail Administrateur</h1>
                    <p className="text-sm font-medium text-muted-foreground mt-0.5">{users.length} utilisateur{users.length !== 1 ? 's' : ''} géré{users.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <Link href="/" className="flex-1 md:flex-none h-11 px-5 rounded-xl font-bold text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center gap-2">
                   <Home className="h-4 w-4" /> Accueil
                </Link>
                <button 
                   onClick={() => signOut()}
                   className="h-11 px-5 rounded-xl font-bold text-sm bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                 >
                   <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Quitter</span>
                </button>
              </div>
            </motion.div>

            {/* Site Stats Widgets */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-8">
              <div className="p-5 rounded-[1.5rem] border bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border-purple-500/20 shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-5">
                   <Users className="w-32 h-32" />
                </div>
                <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400">
                  <Users size={16} />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">Total</span>
                </div>
                <p className="text-3xl sm:text-4xl font-black text-foreground mt-2">{users.length}</p>
              </div>
              
              {siteCounts.filter(s => s.count > 0).map(s => (
                <button
                  key={s.slug}
                  onClick={() => setFilterSite(filterSite === s.slug ? "" : s.slug)}
                  className={`p-5 rounded-[1.5rem] border backdrop-blur-sm transition-all text-left group overflow-hidden relative ${filterSite === s.slug ? 'bg-primary border-primary shadow-xl shadow-primary/20 text-primary-foreground transform scale-[1.02]' : 'bg-card/60 border-border/50 hover:bg-card hover:border-primary/30 hover:shadow-md'}`}
                >
                  <div className={`absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-10 transition-opacity ${filterSite === s.slug ? 'opacity-10' : ''}`}>
                    <MapPin className="w-24 h-24" />
                  </div>
                  <div className={`flex items-center gap-2 mb-2 ${filterSite === s.slug ? 'text-primary-foreground/80' : 'text-primary'}`}>
                    <MapPin size={16} />
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate">{s.slug}</span>
                  </div>
                  <p className={`text-sm font-bold truncate ${filterSite === s.slug ? 'text-primary-foreground' : 'text-foreground/80'}`}>{s.name}</p>
                  <p className={`text-2xl sm:text-3xl font-black mt-1 ${filterSite === s.slug ? 'text-white' : 'text-foreground'}`}>{s.count}</p>
                </button>
              ))}
            </motion.div>

            {/* Users Table / Search */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card/70 backdrop-blur-2xl border border-border/50 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
              
              {/* Toolbar */}
              <div className="p-4 sm:p-5 border-b border-border/50 bg-background/50 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 transition-colors peer-focus:text-primary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par nom, email..."
                    className="peer w-full pl-12 pr-4 py-3.5 text-sm font-medium rounded-2xl border border-border/50 bg-card focus:bg-background focus:ring-2 focus:ring-primary/30 outline-none transition-all shadow-sm placeholder:text-muted-foreground/60"
                  />
                </div>
                <div className="relative w-full md:w-[260px]">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                  <select
                    value={filterSite}
                    onChange={e => setFilterSite(e.target.value)}
                    className="w-full pl-12 pr-10 py-3.5 text-sm font-bold rounded-2xl border border-border/50 bg-card focus:bg-background focus:ring-2 focus:ring-primary/30 outline-none appearance-none cursor-pointer transition-all shadow-sm"
                  >
                    <option value="">Tous les sites</option>
                    {sites.slice(1).map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Users List */}
              <div className="divide-y divide-border/40 max-h-[800px] overflow-y-auto">
                <AnimatePresence>
                  {filteredUsers.map(u => (
                    <motion.div 
                      key={u._id} 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col xl:flex-row xl:items-center justify-between p-5 sm:px-6 gap-4 hover:bg-muted/30 transition-colors group"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-12 w-12 shrink-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full border border-primary/10 flex items-center justify-center font-black text-lg text-primary shadow-inner">
                          {u.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-base truncate text-foreground">{u.name || "Unknown"}</span>
                          <span className="text-sm text-muted-foreground truncate font-medium">{u.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Role selector */}
                        <div className="relative">
                           <select
                             value={u.role || "employee"}
                             onChange={e => updateUserRole(u._id, e.target.value)}
                             className={`text-xs px-3 py-2 rounded-xl font-bold border-0 outline-none cursor-pointer shadow-sm appearance-none pr-8 transition-colors ${ROLES.find(r => r.value === (u.role || "employee"))?.color || ROLES[0].color}`}
                           >
                             {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                           </select>
                        </div>

                        {/* Site selector */}
                        <div className="relative">
                          <select
                            value={u.site || ""}
                            onChange={e => updateUserSite(u._id, e.target.value)}
                            className="text-xs px-3 py-2 rounded-xl font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-500/10 outline-none cursor-pointer shadow-sm appearance-none pr-8"
                          >
                            <option value="">Non assigné</option>
                            {sites.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                          </select>
                        </div>

                        {/* Verified Status */}
                        <span className={`text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm border ${u.verified ? 'bg-green-50 text-green-700 border-green-500/10 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 border-red-500/10 dark:bg-red-900/20 dark:text-red-400'}`}>
                          {u.verified ? "Compte Vérifié" : "En attente"}
                        </span>
                        
                        {/* Toggle verified */}
                        <button 
                           onClick={() => toggleVerified(u._id, u.verified)} 
                           className="ml-2 p-1 text-muted-foreground hover:text-foreground transition-all hover:scale-110 active:scale-95"
                        >
                          {u.verified ? <ToggleRight className="text-green-500 h-8 w-8" /> : <ToggleLeft className="text-muted-foreground/40 h-8 w-8" />}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {filteredUsers.length === 0 && (
                  <div className="p-12 text-center flex flex-col items-center">
                    <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-bold">Aucun résultat</h3>
                    <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                      Nous n'avons trouvé aucun utilisateur correspondant à vos critères de recherche.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </SignedIn>
    </div>
  );
}
