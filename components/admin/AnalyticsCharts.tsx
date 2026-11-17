"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAdminAxisMoney, formatAdminMoney, type InrUsdRate } from "../../lib/currency";

type Point = { amount: number; status: string; created_at: string };
type TopItem = { label: string; count: number; revenue: number };

function getBucket(date: Date, range: "daily" | "weekly" | "monthly") {
  const bucket = new Date(date);
  if (range === "daily") {
    bucket.setHours(0, 0, 0, 0);
    return bucket.toISOString().slice(0, 10);
  }
  if (range === "weekly") {
    bucket.setHours(0, 0, 0, 0);
    const weekday = (bucket.getDay() + 6) % 7;
    bucket.setDate(bucket.getDate() - weekday);
    return bucket.toISOString().slice(0, 10);
  }
  bucket.setDate(1);
  return bucket.toISOString().slice(0, 7);
}

function formatBucket(bucket: string, range: "daily" | "weekly" | "monthly") {
  const date = new Date(`${bucket}${range === "monthly" ? "-01" : "T00:00:00"}`);
  return date.toLocaleDateString("en-IN", range === "monthly" ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" });
}

export default function AnalyticsCharts({
  orders,
  topProducts,
  topCustomers,
  rate,
  rateNotice,
}: {
  orders: Point[];
  topProducts: TopItem[];
  topCustomers: TopItem[];
  rate: InrUsdRate | null;
  rateNotice: string;
}) {
  const [range, setRange] = useState<"daily" | "weekly" | "monthly">("daily");
  const chartData = useMemo(() => {
    const now = new Date();
    const count = range === "daily" ? 30 : 12;
    const buckets: { key: string; revenue: number; orders: number }[] = [];
    for (let offset = count - 1; offset >= 0; offset -= 1) {
      const date = new Date(now);
      if (range === "daily") date.setDate(now.getDate() - offset);
      if (range === "weekly") date.setDate(now.getDate() - offset * 7);
      if (range === "monthly") date.setMonth(now.getMonth() - offset, 1);
      const key = getBucket(date, range);
      buckets.push({ key, revenue: 0, orders: 0 });
    }
    const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    for (const order of orders) {
      const key = getBucket(new Date(order.created_at), range);
      const bucket = byKey.get(key);
      if (bucket) {
        bucket.revenue += order.amount;
        bucket.orders += 1;
      }
    }
    return buckets.map((bucket) => ({
      ...bucket,
      label: formatBucket(bucket.key, range),
    }));
  }, [orders, range]);

  return (
    <>
      <div className="admin-toolbar">
        <span className="admin-muted" role={rate ? "note" : "alert"}>{rateNotice}</span>
        <select className="admin-select" value={range} onChange={(event) => setRange(event.target.value as typeof range)} aria-label="Analytics time range">
          <option value="daily">Daily · 30 days</option>
          <option value="weekly">Weekly · 12 weeks</option>
          <option value="monthly">Monthly · 12 months</option>
        </select>
      </div>
      <div className="admin-chart-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading"><h2>Revenue</h2></div>
          <div className="admin-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#85818f", fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis tick={{ fill: "#85818f", fontSize: 9 }} axisLine={false} tickLine={false} width={55} tickFormatter={(value) => formatAdminAxisMoney(Number(value), rate)} />
                <Tooltip contentStyle={{ background: "#171720", border: "1px solid rgba(255,184,0,.25)", color: "#f8f6f1", fontSize: 10 }} formatter={(value) => [formatAdminMoney(Number(value ?? 0), rate), "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="#ffb800" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#7b2fff" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading"><h2>Orders</h2></div>
          <div className="admin-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#85818f", fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis allowDecimals={false} tick={{ fill: "#85818f", fontSize: 9 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ background: "#171720", border: "1px solid rgba(123,47,255,.4)", color: "#f8f6f1", fontSize: 10 }} />
                <Bar dataKey="orders" fill="#7b2fff" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      <div className="admin-chart-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading"><h2>Top 5 products</h2></div>
          <TopList items={topProducts} empty="No product sales yet." rate={rate} />
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading"><h2>Top 5 customers</h2></div>
          <TopList items={topCustomers} empty="No customer sales yet." rate={rate} />
        </section>
      </div>
    </>
  );
}

function TopList({ items, empty, rate }: { items: TopItem[]; empty: string; rate: InrUsdRate | null }) {
  if (!items.length) return <p className="admin-empty">{empty}</p>;
  return (
    <div className="admin-list">
      {items.map((item, index) => (
        <div className="admin-list-row" key={`${item.label}-${index}`}>
          <span>{index + 1}. {item.label}<br /><small>{item.count} purchases</small></span>
          <strong>{formatAdminMoney(item.revenue, rate)}</strong>
        </div>
      ))}
    </div>
  );
}
