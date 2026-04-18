"use client";

import {
  MapPin, Search, ShieldCheck, ToggleLeft, ToggleRight,
  ShieldAlert, LogOut, ArrowLeft, Home, Users, CheckCircle2,
  Clock, ChevronDown, RefreshCw, X
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useUser, SignedIn, SignedOut, SignIn, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type SiteItem = { slug: string; name: string; };

const ROLES = [
  { value: "employee", label: "Employé", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400", dot: "bg-zinc-400" },
  { value: "manager", label: "Manager", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", dot: "bg-blue-500" },
  { value: "admin", label: "Admin", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", dot: "bg-purple-500" },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [.22, 1, .36, 1] as const } },
};

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const [isAdminAuth, setIsAdminAuth] = useState<boolean | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSite, setFilterSite] = useState("");
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetch("/api/sites", {
      headers: { "x-api-key": process.env.NEXT_PUBLIC_API_SECRET || "" }
    }).then(r => r.json()).then(d => {
      if (d.ok && d.sites) setSites(d.sites);
    }).catch(() => { });
  }, []);

  const fetchUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
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
      setRefreshing(false);
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
    // Optimistic update
    setUsers(u => u.map(user => user._id === id ? { ...user, verified: !currentStatus } : user));
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, verified: !currentStatus })
    });
    if (!res.ok) {
      // Revert on failure
      setUsers(u => u.map(user => user._id === id ? { ...user, verified: currentStatus } : user));
    }
  };

  const updateUserSite = async (id: string, site: string) => {
    const prev = users.find(u => u._id === id)?.site;
    setUsers(u => u.map(user => user._id === id ? { ...user, site } : user));
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, site })
    });
    if (!res.ok) {
      setUsers(u => u.map(user => user._id === id ? { ...user, site: prev } : user));
    }
  };

  const updateUserRole = async (id: string, role: string) => {
    const prev = users.find(u => u._id === id)?.role;
    setUsers(u => u.map(user => user._id === id ? { ...user, role } : user));
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role })
    });
    if (!res.ok) {
      setUsers(u => u.map(user => user._id === id ? { ...user, role: prev } : user));
    }
  };

  const filteredUsers = useMemo(() => users.filter(u => {
    const matchesSearch = !searchQuery ||
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSite = !filterSite || u.site === filterSite;
    return matchesSearch && matchesSite;
  }), [users, searchQuery, filterSite]);

  const siteCounts = useMemo(() => sites.map(s => ({
    ...s,
    count: users.filter(u => u.site === s.slug).length
  })), [sites, users]);

  const verifiedCount = useMemo(() => users.filter(u => u.verified).length, [users]);
  const pendingCount = useMemo(() => users.filter(u => !u.verified).length, [users]);

  /* ───── Loading ───── */
  if (loading || !isLoaded) return (
    <div className="flex h-screen items-center justify-center">
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="flex flex-col items-center gap-5"
      >
        <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center shadow-2xl shadow-primary/10">
          <ShieldCheck className="h-10 w-10 text-primary" />
        </div>
        <p className="text-sm font-bold text-muted-foreground tracking-widest uppercase">Portail administrateur</p>
      </motion.div>
    </div>
  );

  /* ───── Render ───── */
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[60vh] bg-primary/[0.04] blur-[120px] rounded-full pointer-events-none" />

      <SignedOut>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
          <SignIn routing="hash" />
        </div>
      </SignedOut>

      <SignedIn>
        {isAdminAuth === false ? (
          /* ── Access Denied ── */
          <div className="flex min-h-screen items-center justify-center p-4 relative">
            <div className="absolute inset-0 bg-red-500/5 blur-[100px] pointer-events-none" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md p-8 glass rounded-[2rem] shadow-2xl text-center space-y-6"
            >
              <div className="mx-auto h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 ring-8 ring-red-500/5">
                <ShieldAlert className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight mb-2">Accès Refusé</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Vous n&apos;avez pas les privilèges administrateur pour accéder à ce portail.
                  Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, contactez le support.
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
            </motion.div>
          </div>
        ) : (
          /* ── Main Admin Panel ── */
          <div className="relative z-10">

            {/* ━━━ Sticky Header Bar ━━━ */}
            <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/80 backdrop-blur-2xl">
              <div className="flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
                {/* Left */}
                <div className="flex items-center gap-3">
                  <Link href="/" className="h-10 w-10 bg-card hover:bg-muted border border-border/50 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm transition-all">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="h-9 w-9 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-600/20">
                      <ShieldCheck className="h-4.5 w-4.5" />
                    </div>
                    <div className="leading-none">
                      <h1 className="text-base font-black tracking-tight">Admin</h1>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{users.length} utilisateur{users.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {/* Mobile title */}
                  <span className="sm:hidden text-base font-black tracking-tight">Admin</span>
                </div>

                {/* Right */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchUsers(true)}
                    disabled={refreshing}
                    className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-border/50 bg-card hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm transition-all ${refreshing ? 'animate-spin' : ''}`}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <Link href="/" className="hidden sm:flex h-10 px-4 rounded-xl font-bold text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all items-center gap-2">
                    <Home className="h-4 w-4" /> Accueil
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm bg-red-500/10 text-red-500 border border-red-500/15 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Quitter</span>
                  </button>
                </div>
              </div>
            </header>

            <div className="px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto pb-20">

              {/* ━━━ Stats Row ━━━ */}
              <motion.div
                variants={stagger} initial="hidden" animate="show"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 mb-6"
              >
                {/* Total card */}
                <motion.div variants={fadeUp} className="col-span-2 sm:col-span-1 p-4 sm:p-5 rounded-2xl glass relative overflow-hidden">
                  <div className="absolute -right-3 -bottom-3 opacity-[0.04]">
                    <Users className="w-28 h-28" />
                  </div>
                  <div className="flex items-center gap-2 mb-1.5 text-purple-500">
                    <Users size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Total</span>
                  </div>
                  <p className="text-3xl font-black">{users.length}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] font-bold text-green-500 flex items-center gap-1"><CheckCircle2 size={10}/>{verifiedCount} vérifié{verifiedCount !== 1 ? 's' : ''}</span>
                    <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1"><Clock size={10}/>{pendingCount} en attente</span>
                  </div>
                </motion.div>

                {/* Site cards */}
                {siteCounts.filter(s => s.count > 0).map(s => (
                  <motion.button
                    key={s.slug}
                    variants={fadeUp}
                    onClick={() => setFilterSite(filterSite === s.slug ? "" : s.slug)}
                    className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-sm text-left group overflow-hidden relative transition-all duration-300 ${
                      filterSite === s.slug
                        ? 'bg-primary border-primary shadow-xl shadow-primary/25 scale-[1.02]'
                        : 'glass hover:border-primary/30 hover:shadow-lg'
                    }`}
                  >
                    <div className={`absolute -right-3 -bottom-3 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity ${filterSite === s.slug ? 'opacity-[0.08]' : ''}`}>
                      <MapPin className="w-20 h-20" />
                    </div>
                    <div className={`flex items-center gap-1.5 mb-1.5 ${filterSite === s.slug ? 'text-primary-foreground/70' : 'text-primary'}`}>
                      <MapPin size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest truncate">{s.slug}</span>
                    </div>
                    <p className={`text-xs font-bold truncate ${filterSite === s.slug ? 'text-primary-foreground/90' : 'text-foreground/70'}`}>{s.name}</p>
                    <p className={`text-2xl font-black mt-0.5 ${filterSite === s.slug ? 'text-white' : 'text-foreground'}`}>{s.count}</p>
                  </motion.button>
                ))}
              </motion.div>

              {/* ━━━ Search + Filter Bar ━━━ */}
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="flex flex-col sm:flex-row gap-3 mb-5"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par nom ou email..."
                    className="w-full pl-10 pr-10 py-3 text-sm font-medium rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm focus:bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all placeholder:text-muted-foreground/40"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted transition">
                      <X size={14} className="text-muted-foreground" />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                  <select
                    value={filterSite}
                    onChange={e => setFilterSite(e.target.value)}
                    className="w-full sm:w-[220px] pl-10 pr-10 py-3 text-sm font-bold rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm focus:bg-card focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer transition-all"
                  >
                    <option value="">Tous les sites</option>
                    {sites.slice(1).map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                </div>
              </motion.div>

              {/* Active filters indicator */}
              {(searchQuery || filterSite) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Filtres :</span>
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-primary/20 transition">
                      &quot;{searchQuery}&quot; <X size={12} />
                    </button>
                  )}
                  {filterSite && (
                    <button onClick={() => setFilterSite("")} className="text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-emerald-500/20 transition">
                      {sites.find(s => s.slug === filterSite)?.name || filterSite} <X size={12} />
                    </button>
                  )}
                  <button onClick={() => { setSearchQuery(""); setFilterSite(""); }} className="text-xs font-medium text-muted-foreground hover:text-foreground ml-1 transition">
                    Tout effacer
                  </button>
                </motion.div>
              )}

              {/* ━━━ Users Table (Desktop: table rows, Mobile: cards) ━━━ */}
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="glass rounded-2xl overflow-hidden"
              >
                {/* Desktop table header */}
                <div className="hidden lg:grid grid-cols-[1fr_140px_180px_140px_60px] gap-4 px-6 py-3 border-b border-border/30 bg-muted/20">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Utilisateur</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rôle</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Site</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Statut</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Vérif.</span>
                </div>

                {/* Users list */}
                <div className="divide-y divide-border/20 max-h-[calc(100vh-320px)] overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {filteredUsers.map((u, i) => {
                      const roleObj = ROLES.find(r => r.value === (u.role || "employee")) || ROLES[0];
                      return (
                        <motion.div
                          key={u._id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          transition={{ delay: i * 0.02, duration: 0.25 }}
                          className="hover:bg-muted/20 transition-colors"
                        >
                          {/* ── Desktop row ── */}
                          <div className="hidden lg:grid grid-cols-[1fr_140px_180px_140px_60px] gap-4 items-center px-6 py-4">
                            {/* User info */}
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center font-black text-sm text-primary">
                                {u.name?.[0]?.toUpperCase() || "U"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm truncate">{u.name || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                              </div>
                            </div>

                            {/* Role */}
                            <select
                              value={u.role || "employee"}
                              onChange={e => updateUserRole(u._id, e.target.value)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-bold outline-none cursor-pointer transition-colors ${roleObj.color}`}
                            >
                              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>

                            {/* Site */}
                            <select
                              value={u.site || ""}
                              onChange={e => updateUserSite(u._id, e.target.value)}
                              className="text-xs px-3 py-1.5 rounded-lg font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 outline-none cursor-pointer"
                            >
                              <option value="">Non assigné</option>
                              {sites.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                            </select>

                            {/* Status */}
                            <span className={`text-[11px] px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 w-fit ${
                              u.verified
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.verified ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                              {u.verified ? "Vérifié" : "En attente"}
                            </span>

                            {/* Toggle */}
                            <div className="flex justify-center">
                              <button
                                onClick={() => toggleVerified(u._id, u.verified)}
                                className="text-muted-foreground hover:text-foreground transition-all hover:scale-110 active:scale-90"
                              >
                                {u.verified
                                  ? <ToggleRight className="text-green-500 h-7 w-7" />
                                  : <ToggleLeft className="text-muted-foreground/30 h-7 w-7" />
                                }
                              </button>
                            </div>
                          </div>

                          {/* ── Mobile / Tablet card ── */}
                          <div className="lg:hidden p-4">
                            <div className="flex items-start gap-3">
                              {/* Avatar */}
                              <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center font-black text-base text-primary">
                                {u.name?.[0]?.toUpperCase() || "U"}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <p className="font-bold text-sm truncate">{u.name || "Unknown"}</p>
                                  <button
                                    onClick={() => toggleVerified(u._id, u.verified)}
                                    className="shrink-0"
                                  >
                                    {u.verified
                                      ? <ToggleRight className="text-green-500 h-7 w-7" />
                                      : <ToggleLeft className="text-muted-foreground/30 h-7 w-7" />
                                    }
                                  </button>
                                </div>
                                <p className="text-xs text-muted-foreground truncate mb-3">{u.email}</p>

                                {/* Controls row */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <select
                                    value={u.role || "employee"}
                                    onChange={e => updateUserRole(u._id, e.target.value)}
                                    className={`text-[11px] px-2.5 py-1.5 rounded-lg font-bold outline-none cursor-pointer ${roleObj.color}`}
                                  >
                                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                  </select>

                                  <select
                                    value={u.site || ""}
                                    onChange={e => updateUserSite(u._id, e.target.value)}
                                    className="text-[11px] px-2.5 py-1.5 rounded-lg font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 outline-none cursor-pointer"
                                  >
                                    <option value="">Non assigné</option>
                                    {sites.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                                  </select>

                                  <span className={`text-[10px] px-2 py-1 rounded-md font-bold flex items-center gap-1 ${
                                    u.verified
                                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${u.verified ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                                    {u.verified ? "Vérifié" : "En attente"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {filteredUsers.length === 0 && (
                    <div className="py-16 px-8 text-center flex flex-col items-center">
                      <div className="h-16 w-16 bg-muted/30 rounded-2xl flex items-center justify-center mb-5">
                        <Search className="h-7 w-7 text-muted-foreground/30" />
                      </div>
                      <h3 className="text-base font-black mb-1">Aucun résultat</h3>
                      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                        Aucun utilisateur ne correspond à vos critères de recherche.
                      </p>
                      <button
                        onClick={() => { setSearchQuery(""); setFilterSite(""); }}
                        className="mt-4 text-sm font-bold text-primary hover:underline"
                      >
                        Réinitialiser les filtres
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer count */}
                {filteredUsers.length > 0 && (
                  <div className="px-6 py-3 border-t border-border/20 bg-muted/10 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground">
                      {filteredUsers.length} résultat{filteredUsers.length !== 1 ? 's' : ''}
                      {(searchQuery || filterSite) ? ' (filtré)' : ''}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 font-medium">BKTK Admin v1.0</span>
                  </div>
                )}
              </motion.div>

            </div>

            {/* ━━━ Mobile Bottom Nav ━━━ */}
            <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-background/90 backdrop-blur-2xl border-t border-border/30 pb-safe">
              <div className="flex items-center justify-around h-14">
                <Link href="/" className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary transition px-4 py-1.5">
                  <Home size={18} />
                  <span className="text-[9px] font-bold">Accueil</span>
                </Link>
                <button className="flex flex-col items-center gap-0.5 text-primary px-4 py-1.5">
                  <ShieldCheck size={18} />
                  <span className="text-[9px] font-bold">Admin</span>
                </button>
                <button
                  onClick={() => fetchUsers(true)}
                  className={`flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary transition px-4 py-1.5 ${refreshing ? 'animate-spin' : ''}`}
                >
                  <RefreshCw size={18} />
                  <span className="text-[9px] font-bold">Rafraîchir</span>
                </button>
                <button
                  onClick={() => signOut()}
                  className="flex flex-col items-center gap-0.5 text-red-500 px-4 py-1.5"
                >
                  <LogOut size={18} />
                  <span className="text-[9px] font-bold">Quitter</span>
                </button>
              </div>
            </div>

          </div>
        )}
      </SignedIn>
    </div>
  );
}
