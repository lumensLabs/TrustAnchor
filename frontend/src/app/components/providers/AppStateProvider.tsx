 "use client";
 
 import { createContext, useContext, useEffect, useMemo, useState } from "react";
 
 export interface User {
   id: string;
   email: string;
   walletAddress?: string;
 }
 
 export interface WalletState {
   isConnected: boolean;
   address: string | null;
   walletName: string | null;
 }
 
 export interface AppState {
   isAuthenticated: boolean;
   user: User | null;
   wallet: WalletState;
   login: (user: User) => void;
   logout: () => void;
   connectWallet: (address: string, walletName?: string) => void;
   disconnectWallet: () => void;
 }
 
 const DEFAULT_STATE: AppState = {
   isAuthenticated: false,
   user: null,
   wallet: {
     isConnected: false,
     address: null,
     walletName: null,
   },
   login: () => {},
   logout: () => {},
   connectWallet: () => {},
   disconnectWallet: () => {},
 };
 
 const STORAGE_KEY = "remitlend_app_state_v1";
 
 const AppStateContext = createContext<AppState>(DEFAULT_STATE);
 
 function safeParse<T>(raw: string | null): T | null {
   if (!raw) return null;
   try {
     return JSON.parse(raw) as T;
   } catch {
     return null;
   }
 }
 
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const cached =
    typeof window !== "undefined"
      ? safeParse<{
          isAuthenticated: boolean;
          user: User | null;
          wallet: WalletState;
        }>(window.localStorage.getItem(STORAGE_KEY))
      : null;
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    cached?.isAuthenticated ?? false,
  );
  const [user, setUser] = useState<User | null>(cached?.user ?? null);
  const [wallet, setWallet] = useState<WalletState>(
    cached?.wallet ?? {
      isConnected: false,
      address: null,
      walletName: null,
    },
  );
 
   // Persist to localStorage
   useEffect(() => {
     if (typeof window === "undefined") return;
     const snapshot = JSON.stringify({ isAuthenticated, user, wallet });
     window.localStorage.setItem(STORAGE_KEY, snapshot);
   }, [isAuthenticated, user, wallet]);
 
   const value = useMemo<AppState>(() => {
     return {
       isAuthenticated,
       user,
       wallet,
       login: (u: User) => {
         setUser(u);
         setIsAuthenticated(true);
         setWallet((w) => ({
           ...w,
           address: u.walletAddress ?? w.address,
         }));
       },
       logout: () => {
         setIsAuthenticated(false);
         setUser(null);
       },
       connectWallet: (address: string, walletName?: string) => {
         setWallet({
           isConnected: true,
           address,
           walletName: walletName ?? null,
         });
         setUser((prev) =>
           prev ? { ...prev, walletAddress: address } : prev,
         );
       },
       disconnectWallet: () => {
         setWallet({
           isConnected: false,
           address: null,
           walletName: null,
         });
       },
     };
   }, [isAuthenticated, user, wallet]);
 
   return (
     <AppStateContext.Provider value={value}>
       {children}
     </AppStateContext.Provider>
   );
 }
 
 export function useAppState() {
   return useContext(AppStateContext);
 }
 
