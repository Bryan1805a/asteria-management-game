"use client"; // This tells Next.js this is an interactive client-side component

import { useEffect, useState } from "react";

export default function Home() {
  // Set up state
  const [inventory, setInventory] = useState({
    username: "Connecting...",
    credits: 0,
    iron_ore: 0,
    water: 0
  });

  const [status, setStatus] = useState("CONNECTING...");

  // Establish the WebSocket connection when the page loads
  useEffect(() => {
    // Connect to the FastAPI WebSocket route
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/inventory");

    ws.onopen = () => setStatus("SECURE");
    ws.onclose = () => setStatus("OFFLINE");

    // Every time Python sends a message, update the screen instantly
    ws.onmessage = (event) => {
      const liveData = JSON.parse(event.data);
      setInventory(liveData);
    };

    // Clean up the connection if close the browser tab
    return () => ws.close();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f18] text-slate-300 font-sans p-4 flex flex-col gap-4">
      
      {/* HEADER */}
      <header className="border border-slate-700 bg-slate-900/80 p-3 flex justify-between items-center shadow-lg">
        <div className="text-xl font-bold tracking-widest text-blue-500">ASTERIA_OS v1.1</div>
        <div className="font-mono text-sm uppercase flex items-center gap-3">
          <span className="text-slate-500">Connection:</span>
          <span className={`flex items-center gap-2 ${status === 'SECURE' ? 'text-emerald-400' : 'text-red-500'}`}>
            <span className={`w-2 h-2 rounded-full ${status === 'SECURE' ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`}></span> 
            {status}
          </span>
          <span className="text-slate-500 ml-4">Cmdr:</span>
          <span className="text-white">{inventory.username}</span>
        </div>
      </header>

      {/* MAIN GRID LAYOUT */}
      <main className="grid grid-cols-1 md:grid-cols-4 gap-4 grow">
        
        {/* LOCAL INVENTORY */}
        <section className="border border-slate-700 bg-slate-900/50 flex flex-col shadow-lg">
          <div className="bg-slate-800 p-2 text-xs font-bold tracking-widest uppercase border-b border-slate-700 text-slate-400 flex justify-between">
            <span>Local Inventory</span>
            <span className="text-emerald-500 animate-pulse">● LIVE</span>
          </div>
          <div className="p-4 flex flex-col gap-3 font-mono text-sm">
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-500">Credits</span>
              <span className="text-yellow-400 transition-all duration-300">Ʀ {inventory.credits}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-500">Iron Ore</span>
              {/* Added a subtle color pop to show it's actively mining */}
              <span className="text-orange-400 transition-all duration-300">{inventory.iron_ore} kg</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-500">Water</span>
              <span className="text-cyan-400 transition-all duration-300">{inventory.water} L</span>
            </div>
          </div>
        </section>

        {/* ACTIVE OPERATIONS */}
        <section className="border border-slate-700 bg-slate-900/50 flex flex-col shadow-lg md:col-span-3">
          <div className="bg-slate-800 p-2 text-xs font-bold tracking-widest uppercase border-b border-slate-700 text-slate-400">
            Active Operations & Fleet
          </div>
          <div className="p-4 flex flex-col items-center justify-center h-full text-slate-600 font-mono text-sm">
            [ MINING DRILLS: ACTIVE ] <br/>
            [ WATER CONDENSERS: ACTIVE ]
          </div>
        </section>

        {/* AI COMMS TERMINAL */}
        <section className="border border-slate-700 bg-slate-900/50 flex flex-col shadow-lg md:col-span-4 h-48">
          <div className="bg-slate-800 p-2 text-xs font-bold tracking-widest uppercase border-b border-slate-700 flex justify-between items-center">
            <span className="text-slate-400">Comms Link // Dolphin-Phi</span>
            <span className="text-yellow-500 text-[10px]">STANDBY</span>
          </div>
          <div className="p-4 font-mono text-sm text-slate-500 overflow-y-auto">
            <p>{">"} Asteria station mainframe initialized.</p>
            <p>{">"} Real-time telemetry established.</p>
            <p className="text-emerald-500/70">{">"} Mining operations commenced.</p>
          </div>
        </section>

      </main>
    </div>
  );
}