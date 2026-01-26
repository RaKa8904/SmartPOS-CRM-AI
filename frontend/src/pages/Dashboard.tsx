import Layout from "../components/Layout";

export default function Dashboard() {
  return (
    <Layout title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-zinc-400 text-sm">Total Sales</p>
          <h2 className="text-2xl font-bold mt-2">₹ 0</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-zinc-400 text-sm">Invoices</p>
          <h2 className="text-2xl font-bold mt-2">0</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-zinc-400 text-sm">Notifications</p>
          <h2 className="text-2xl font-bold mt-2">0</h2>
        </div>
      </div>

      <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="font-semibold text-lg">Quick Actions</h3>
        <p className="text-zinc-400 text-sm mt-1">
          Next we’ll connect backend stats here.
        </p>
      </div>
    </Layout>
  );
}
