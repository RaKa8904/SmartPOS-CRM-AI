import Layout from "../components/Layout";

export default function Notifications() {
  return (
    <Layout title="Notifications">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-lg font-semibold">Email Notifications</h2>
        <p className="text-zinc-500 mt-2">
          Next: generate + send pending from UI.
        </p>
      </div>
    </Layout>
  );
}
