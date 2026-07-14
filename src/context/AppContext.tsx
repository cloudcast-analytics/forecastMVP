import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Company, Location } from '../types/database'
import { isDemo, supabase } from '../lib/supabase'
import { getCompanies, getLocations } from '../services/supabaseService'
import { DEMO_COMPANY, DEMO_LOCATION, DEMO_LOCATION_2 } from '../data/demoSeed'

export type Role = 'admin' | 'customer' | null
export type DemoViewRole = 'admin' | 'customer'

// Eén bron voor "welke rol zie ik nu": in demo-modus overschrijft de demo-wisselknop de echte rol
export function resolveRole(isDemoMode: boolean, demoViewRole: DemoViewRole, actualRole: Role): Role {
  return isDemoMode ? demoViewRole : actualRole
}

interface AppContextValue {
  selectedCompany: Company | null
  selectedLocation: Location | null
  setSelectedCompany: (c: Company | null) => void
  setSelectedLocation: (l: Location | null) => void
  companies: Company[]
  locations: Location[]
  currentUser: { email: string } | null
  isAuthenticated: boolean
  isDemo: boolean
  role: Role
  demoViewRole: DemoViewRole
  setDemoViewRole: (r: DemoViewRole) => void
  login: (email?: string) => void
  logout: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null)
  const [selectedLocation, setSelectedLocationState] = useState<Location | null>(null)
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(isDemo)
  const [actualRole, setActualRole] = useState<Role>(isDemo ? 'admin' : null)
  const [demoViewRole, setDemoViewRole] = useState<DemoViewRole>('admin')
  const role = resolveRole(isDemo, demoViewRole, actualRole)

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('user_id', userId)
      .single()

    if (!data) return

    setActualRole(data.role as Role)

    if (data.role === 'customer' && data.company_id) {
      // Customer: laad alleen zijn eigen bedrijf
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', data.company_id)
        .single()
      if (company) {
        setCompanies([company])
        setSelectedCompanyState(company)
      }
    } else {
      // Admin: laad alle bedrijven
      const all = await getCompanies()
      setCompanies(all)
      if (all.length > 0) setSelectedCompanyState(all[0])
    }
  }

  useEffect(() => {
    if (isDemo) {
      setCurrentUser({ email: 'demo@cloudcast.be' })
      setIsAuthenticated(true)
      setActualRole('admin')
      setCompanies([DEMO_COMPANY])
      setLocations([DEMO_LOCATION, DEMO_LOCATION_2])
      setSelectedCompanyState(DEMO_COMPANY)
      setSelectedLocationState(DEMO_LOCATION)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser({ email: session.user.email ?? '' })
        setIsAuthenticated(true)
        loadProfile(session.user.id)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser({ email: session.user.email ?? '' })
        setIsAuthenticated(true)
        loadProfile(session.user.id)
      } else {
        setCurrentUser(null)
        setIsAuthenticated(false)
        setActualRole(null)
        setCompanies([])
        setSelectedCompanyState(null)
        setSelectedLocationState(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!selectedCompany || isDemo) return
    getLocations(selectedCompany.id).then(data => {
      setLocations(data)
      if (data.length > 0) setSelectedLocationState(data[0])
    })
  }, [selectedCompany])

  function setSelectedCompany(c: Company | null) {
    setSelectedCompanyState(c)
  }

  function setSelectedLocation(l: Location | null) {
    setSelectedLocationState(l)
  }

  function login(email?: string) {
    setCurrentUser({ email: email ?? 'demo@cloudcast.be' })
    setIsAuthenticated(true)
    if (isDemo) {
      setActualRole('admin')
      setCompanies([DEMO_COMPANY])
      setLocations([DEMO_LOCATION, DEMO_LOCATION_2])
      setSelectedCompanyState(DEMO_COMPANY)
      setSelectedLocationState(DEMO_LOCATION)
    }
  }

  async function logout() {
    if (!isDemo) await supabase.auth.signOut()
    setCurrentUser(null)
    setIsAuthenticated(false)
    setActualRole(null)
    setCompanies([])
    setSelectedCompanyState(null)
    setSelectedLocationState(null)
  }

  return (
    <AppContext.Provider
      value={{
        selectedCompany,
        selectedLocation,
        setSelectedCompany,
        setSelectedLocation,
        companies,
        locations,
        currentUser,
        isAuthenticated,
        isDemo,
        role,
        demoViewRole,
        setDemoViewRole,
        login,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
