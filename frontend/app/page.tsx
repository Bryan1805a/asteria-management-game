// Notice the 'async' keyword here. This allows us to fetch data directly!
export default async function Home() {
  
  // 1. We tell Next.js to reach out to our FastAPI Python server
  // The 'cache: no-store' tells Next.js to always get the freshest data, 
  // rather than saving an old version of the response.
  const response = await fetch("http://localhost:8000/", { cache: "no-store" });
  
  // 2. We convert the Python response into a format JavaScript understands (JSON)
  const data = await response.json();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
      <h1 className="text-5xl font-bold text-blue-400 mb-8">
        Asteria Station Command Center
      </h1>
      
      {/* 3. We display the message dynamically grabbed from Python! */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl text-center">
        <p className="text-sm text-slate-400 uppercase tracking-widest mb-2">System Status</p>
        <p className="text-xl text-emerald-400 font-mono">
          {data.message}
        </p>
      </div>
    </main>
  );
}