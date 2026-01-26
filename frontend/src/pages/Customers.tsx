import Layout from "../components/Layout";

export default function Customers() {
  return (
    <Layout title="Customers (CRM)">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-lg font-semibold">Customer Management</h2>
        <p className="text-zinc-500 mt-2">
          Next: list customers + click to view history.
        </p>
      </div>
    </Layout>
  );
}
