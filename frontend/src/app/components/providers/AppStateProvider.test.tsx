 import { render, screen, fireEvent, waitFor } from "@testing-library/react";
 import { AppStateProvider, useAppState } from "./AppStateProvider";
 
 function Consumer() {
   const { isAuthenticated, wallet, login, connectWallet } = useAppState();
   return (
     <div>
       <div>auth:{isAuthenticated ? "yes" : "no"}</div>
       <div>wallet:{wallet.isConnected ? wallet.address : "disconnected"}</div>
       <button
         onClick={() =>
           login({ id: "1", email: "user@example.com", walletAddress: undefined })
         }
       >
         login
       </button>
       <button onClick={() => connectWallet("GABC123", "Freighter")}>
         connect
       </button>
     </div>
   );
 }
 
 describe("AppStateProvider", () => {
   it("provides initial unauthenticated and disconnected state", async () => {
     render(
       <AppStateProvider>
         <Consumer />
       </AppStateProvider>,
     );
 
     await waitFor(() => {
       expect(screen.getByText(/auth:no/i)).toBeInTheDocument();
       expect(screen.getByText(/wallet:disconnected/i)).toBeInTheDocument();
     });
   });
 
   it("updates state via provided actions", async () => {
     render(
       <AppStateProvider>
         <Consumer />
       </AppStateProvider>,
     );
 
     await waitFor(() => {
       expect(screen.getByText(/auth:no/i)).toBeInTheDocument();
     });
 
     fireEvent.click(screen.getByText("login"));
     await waitFor(() => {
       expect(screen.getByText(/auth:yes/i)).toBeInTheDocument();
     });
 
     fireEvent.click(screen.getByText("connect"));
     await waitFor(() => {
       expect(screen.getByText(/wallet:GABC123/i)).toBeInTheDocument();
     });
   });
 });
 
