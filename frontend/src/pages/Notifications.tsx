import { useEffect, useState } from "react";
import { api } from "../api";

type Product = {
  id: number;
  name: string;
  price: number;
};

type EligibleCustomer = {
  customer_id: number;
  customer_name: string;
  phone?: string;
  email?: string;
  invoice_id: number;
  old_price: number;
  current_price: number;
  difference: number;
};

type PriceDropResponse = {
  product_id: number;
  product_name: string;
  current_price: number;
  eligible_customers: EligibleCustomer[];
  count: number;
};

type NotificationTemplate = {
  id: number;
  name: string;
  channel: "EMAIL" | "SMS";
  subject_template: string | null;
  body_template: string;
  is_active: boolean;
  created_at: string;
};

type NotificationCampaign = {
  id: number;
  name: string;
  channel: "EMAIL" | "SMS";
  template_id: number | null;
  product_id: number | null;
  status: string;
  total_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  sent_at: string | null;
};

type NotificationItem = {
  id: number;
  customer_id: number;
  product_id: number;
  campaign_id: number | null;
  template_id: number | null;
  channel: "EMAIL" | "SMS";
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  status: string;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  last_attempt_at: string | null;
};

export default function Notifications() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] =
    useState<number | "">("");
  const [selectedChannel, setSelectedChannel] =
    useState<"EMAIL" | "SMS">("EMAIL");
  const [campaignName, setCampaignName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<number | "">("");
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [templates, setTemplates] = useState<
    NotificationTemplate[]
  >([]);
  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState(
    "Price Drop Alert: {product_name}"
  );
  const [templateBody, setTemplateBody] = useState(
    "Hello {customer_name}, the price of {product_name} dropped from ₹{old_price} to ₹{new_price}. Save ₹{difference} today."
  );
  const [creatingTemplate, setCreatingTemplate] =
    useState(false);

  const [campaigns, setCampaigns] = useState<
    NotificationCampaign[]
  >([]);
  const [selectedCampaignId, setSelectedCampaignId] =
    useState<number | "">("");
  const [campaignNotifications, setCampaignNotifications] =
    useState<NotificationItem[]>([]);
  const [loadingCampaignNotifications, setLoadingCampaignNotifications] =
    useState(false);

  const [creatingCampaign, setCreatingCampaign] =
    useState(false);
  const [dropData, setDropData] =
    useState<PriceDropResponse | null>(null);
  const [loadingDropData, setLoadingDropData] = useState(false);

  const [sending, setSending] = useState(false);

  // ---------------- FETCHERS ----------------

  const fetchProducts = async () => {
    try {
      const res = await api.get<Product[]>("/products/list");
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch products ❌");
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get<NotificationTemplate[]>(
        "/notifications/templates"
      );
      setTemplates(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setTemplates([]);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await api.get<NotificationCampaign[]>(
        "/notifications/campaigns"
      );
      setCampaigns(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setCampaigns([]);
    }
  };

  const fetchCampaignNotifications = async (
    campaignId: number
  ) => {
    setLoadingCampaignNotifications(true);
    try {
      const res = await api.get<NotificationItem[]>(
        `/notifications/campaigns/${campaignId}/notifications`
      );
      setCampaignNotifications(
        Array.isArray(res.data) ? res.data : []
      );
    } catch (err) {
      console.error(err);
      setCampaignNotifications([]);
    } finally {
      setLoadingCampaignNotifications(false);
    }
  };

  const fetchPriceDrops = async (productId: number) => {
    setLoadingDropData(true);
    try {
      const res = await api.get<PriceDropResponse>(
        `/price-drops/product/${productId}`
      );
      setDropData(res.data ?? null);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch eligible customers ❌");
      setDropData(null);
    } finally {
      setLoadingDropData(false);
    }
  };

  const createCampaign = async () => {
    if (!selectedProductId) {
      alert("Select a product first!");
      return;
    }

    setCreatingCampaign(true);
    try {
      const productId = Number(selectedProductId);
      const payload = {
        name: campaignName.trim() || null,
        template_id:
          selectedTemplateId === ""
            ? null
            : Number(selectedTemplateId),
        channel: selectedChannel,
      };

      const res = await api.post(
        `/notifications/campaigns/product/${productId}`,
        payload
      );

      const id = res.data?.campaign_id;
      if (id) {
        setSelectedCampaignId(id);
        await fetchCampaignNotifications(id);
      }
      await fetchCampaigns();
      await fetchPriceDrops(productId);

      alert("Campaign created successfully ✅");
    } catch (err) {
      console.error(err);
      alert("Failed to create campaign ❌");
    } finally {
      setCreatingCampaign(false);
    }
  };

  const sendCampaign = async (
    campaignId: number,
    retryFailed: boolean = false
  ) => {
    setSending(true);
    try {
      await api.post(
        `/notifications/campaigns/${campaignId}/send?retry_failed=${
          retryFailed ? "true" : "false"
        }`
      );
      await fetchCampaigns();
      await fetchCampaignNotifications(campaignId);
      alert(
        retryFailed
          ? "Retry send completed ✅"
          : "Campaign send completed ✅"
      );
    } catch (err) {
      console.error(err);
      alert("Failed to send campaign ❌");
    } finally {
      setSending(false);
    }
  };

  const retryNotification = async (
    notificationId: number
  ) => {
    try {
      await api.post(`/notifications/${notificationId}/retry`);
      if (selectedCampaignId) {
        await fetchCampaignNotifications(
          Number(selectedCampaignId)
        );
        await fetchCampaigns();
      }
      alert("Notification retry requested ✅");
    } catch (err) {
      console.error(err);
      alert("Retry failed ❌");
    }
  };

  const createTemplate = async () => {
    if (!templateName.trim() || !templateBody.trim()) {
      alert("Template name and body are required");
      return;
    }

    setCreatingTemplate(true);
    try {
      await api.post("/notifications/templates", {
        name: templateName.trim(),
        channel: selectedChannel,
        subject_template:
          selectedChannel === "EMAIL"
            ? templateSubject.trim() || null
            : null,
        body_template: templateBody,
      });
      await fetchTemplates();
      setTemplateName("");
      alert("Template created ✅");
    } catch (err) {
      console.error(err);
      alert("Failed to create template ❌");
    } finally {
      setCreatingTemplate(false);
    }
  };

  // ---------------- EFFECTS ----------------

  useEffect(() => {
    const load = async () => {
      await fetchProducts();
      await fetchTemplates();
      await fetchCampaigns();
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!selectedProductId) {
        setDropData(null);
        return;
      }
      await fetchPriceDrops(Number(selectedProductId));
    };
    load();
  }, [selectedProductId]);

  useEffect(() => {
    const load = async () => {
      if (!selectedCampaignId) {
        setCampaignNotifications([]);
        return;
      }
      await fetchCampaignNotifications(Number(selectedCampaignId));
    };
    load();
  }, [selectedCampaignId]);

  // ---------------- UI ----------------

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* LEFT */}
      <div className="glass-card rounded-2xl p-5 fade-in">
        <h2 className="section-title text-gradient mb-4">
          Campaign Builder
        </h2>

        <label className="text-sm text-zinc-400">
          Select Product
        </label>

        <select
          className="input-surface mt-2"
          value={selectedProductId}
          onChange={(e) => {
            const value = e.target.value
              ? Number(e.target.value)
              : "";
            setSelectedProductId(value);
          }}
          disabled={loadingProducts}
        >
          <option value="">-- Select Product --</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (₹{p.price})
            </option>
          ))}
        </select>

        <label className="text-sm text-zinc-400 mt-4 block">
          Channel
        </label>
        <select
          className="input-surface mt-2"
          value={selectedChannel}
          onChange={(e) =>
            setSelectedChannel(
              e.target.value as "EMAIL" | "SMS"
            )
          }
        >
          <option value="EMAIL">EMAIL</option>
          <option value="SMS">SMS</option>
        </select>

        <label className="text-sm text-zinc-400 mt-4 block">
          Campaign Name (optional)
        </label>
        <input
          className="input-surface mt-2"
          placeholder="Weekend Price Drop Campaign"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
        />

        <label className="text-sm text-zinc-400 mt-4 block">
          Template (optional)
        </label>
        <select
          className="input-surface mt-2"
          value={selectedTemplateId}
          onChange={(e) => {
            const value = e.target.value
              ? Number(e.target.value)
              : "";
            setSelectedTemplateId(value);
          }}
        >
          <option value="">-- Use default message --</option>
          {templates
            .filter((t) => t.is_active)
            .filter((t) => t.channel === selectedChannel)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>

        <button
          onClick={createCampaign}
          disabled={creatingCampaign || !selectedProductId}
          className={`w-full mt-4 py-2 rounded-lg font-medium transition text-white ${
            creatingCampaign || !selectedProductId
              ? "bg-slate-700/60 cursor-not-allowed"
              : "btn-primary"
          }`}
        >
          {creatingCampaign
            ? "Creating..."
            : "Create Campaign"}
        </button>

        <p className="text-xs text-zinc-500 mt-3">
          Creates queued notifications from price-drop eligible
          customers using your selected template and channel.
        </p>
      </div>

      {/* TEMPLATE CREATOR */}
      <div className="glass-card rounded-2xl p-5 fade-in stagger-1">
        <h2 className="section-title mb-4">
          Template Studio
        </h2>

        <label className="text-sm text-zinc-400">
          Template Name
        </label>
        <input
          className="input-surface mt-2"
          placeholder="Price Drop Classic"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
        />

        {selectedChannel === "EMAIL" && (
          <>
            <label className="text-sm text-zinc-400 mt-4 block">
              Subject Template
            </label>
            <input
              className="input-surface mt-2"
              value={templateSubject}
              onChange={(e) =>
                setTemplateSubject(e.target.value)
              }
            />
          </>
        )}

        <label className="text-sm text-zinc-400 mt-4 block">
          Body Template
        </label>
        <textarea
          className="input-surface mt-2 min-h-32"
          value={templateBody}
          onChange={(e) => setTemplateBody(e.target.value)}
        />

        <button
          onClick={createTemplate}
          disabled={creatingTemplate}
          className={`w-full mt-4 py-2 rounded-lg font-medium transition text-white ${
            creatingTemplate
              ? "bg-slate-700/60 cursor-not-allowed"
              : "btn-primary"
          }`}
        >
          {creatingTemplate
            ? "Saving..."
            : "Save Template"}
        </button>

        <p className="text-xs text-zinc-500 mt-3">
          Variables: {"{customer_name}"}, {"{product_name}"},
          {" {old_price}"}, {" {new_price}"},
          {" {difference}"}
        </p>
      </div>

      {/* RIGHT */}
      <div className="lg:col-span-2 glass-card rounded-2xl p-5 fade-in stagger-2">
        <div className="flex items-center justify-between">
          <h2 className="section-title">
            Campaign History & Delivery Status
          </h2>

          <button
            className="input-surface px-3 py-1 text-sm w-auto"
            disabled={loadingDropData}
            onClick={() => {
              fetchCampaigns();
              if (selectedCampaignId) {
                fetchCampaignNotifications(
                  Number(selectedCampaignId)
                );
              }
            }}
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            className="input-surface"
            value={selectedCampaignId}
            onChange={(e) => {
              const value = e.target.value
                ? Number(e.target.value)
                : "";
              setSelectedCampaignId(value);
            }}
          >
            <option value="">-- Select Campaign --</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.id} {c.name} [{c.status}]
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              className="btn-primary w-full py-2 rounded-lg text-white disabled:bg-slate-700/60"
              disabled={
                sending || selectedCampaignId === ""
              }
              onClick={() => {
                if (selectedCampaignId) {
                  sendCampaign(Number(selectedCampaignId));
                }
              }}
            >
              Send Pending
            </button>
            <button
              className="input-surface w-full py-2 rounded-lg"
              disabled={
                sending || selectedCampaignId === ""
              }
              onClick={() => {
                if (selectedCampaignId) {
                  sendCampaign(
                    Number(selectedCampaignId),
                    true
                  );
                }
              }}
            >
              Retry Failed
            </button>
          </div>
        </div>

        {selectedCampaignId === "" ? (
          <p className="text-zinc-500 mt-4">
            Select a campaign to view delivery history.
          </p>
        ) : loadingCampaignNotifications ? (
          <p className="text-zinc-400 mt-4">
            Loading campaign notifications...
          </p>
        ) : !campaignNotifications ? (
          <p className="text-zinc-500 mt-4">
            No data found.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-[#33437f]/35 overflow-auto bg-[#0d1635]/55 p-4">
              {campaignNotifications.length === 0 ? (
                <p className="text-zinc-500 text-sm">
                  No notifications in this campaign.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-300/85 border-b border-[#33437f]/35">
                      <th className="text-left py-2">
                        Channel
                      </th>
                      <th className="text-left py-2">
                        Recipient
                      </th>
                      <th className="text-left py-2">
                        Status
                      </th>
                      <th className="text-left py-2">
                        Retry Count
                      </th>
                      <th className="text-left py-2">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignNotifications.map((n) => (
                        <tr
                          key={n.id}
                          className="border-b border-[#33437f]/25 odd:bg-[#11204b]/25 hover:bg-[#203063]/28 transition"
                        >
                          <td className="py-2">
                            <div className="font-medium">
                              {n.channel}
                            </div>
                          </td>
                          <td className="py-2">
                            {n.channel === "EMAIL"
                              ? n.email ?? "-"
                              : n.phone ?? "-"}
                          </td>
                          <td className="py-2">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                n.status === "SENT"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : n.status === "FAILED"
                                  ? "bg-rose-500/20 text-rose-300"
                                  : "bg-amber-500/20 text-amber-300"
                              }`}
                            >
                              {n.status}
                            </span>
                            {n.error_message && (
                              <div className="text-[11px] text-rose-300 mt-1">
                                {n.error_message}
                              </div>
                            )}
                          </td>
                          <td className="py-2">
                            {n.retry_count ?? 0}
                          </td>
                          <td className="py-2">
                            <button
                              className="input-surface px-3 py-1 text-xs w-auto disabled:bg-slate-700/60"
                              disabled={n.status !== "FAILED"}
                              onClick={() =>
                                retryNotification(n.id)
                              }
                            >
                              Retry
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {selectedProductId && dropData && (
          <div className="mt-6 rounded-xl border border-[#33437f]/35 bg-[#0d1635]/55 p-4">
            <h3 className="font-semibold mb-2">
              Eligible Customers Snapshot
            </h3>
            <p className="text-sm text-zinc-400">
              Product: {dropData.product_name} | Current Price: ₹
              {dropData.current_price} | Eligible: {dropData.count}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
