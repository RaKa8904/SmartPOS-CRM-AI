import Layout from "../components/Layout";

export default function Billing() {
  return (
    <Layout title="Billing (POS)">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-lg font-semibold">Product Search</h2>
          <input
            placeholder="Search product..."
            className="mt-4 w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 outline-none focus:border-indigo-500"
          />
          <p className="text-zinc-500 text-sm mt-3">
            Next: live search + add to cart.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-lg font-semibold">Cart</h2>
          <p className="text-zinc-500 text-sm mt-2">
            Cart UI will come next.
          </p>

          <div className="mt-6 border-t border-zinc-800 pt-4 flex items-center justify-between">
            <span className="text-zinc-400">Total</span>
            <span className="font-bold">₹ 0</span>
          </div>

          <button className="mt-4 w-full bg-indigo-500 hover:bg-indigo-600 transition px-4 py-3 rounded-xl font-semibold">
            Create Invoice
          </button>
        </div>
      </div>
    </Layout>
  );
}
