"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SeriesPoint = { label: string; value: number };
type ComparePoint = { label: string; spend: number; leads: number; revenue: number };
type MultiClientPoint = {
  label: string;
  [key: string]: string | number;
};

const tipStyle = {
  borderRadius: 12,
  border: "1px solid #e4e4e7",
  fontSize: 12,
};

export function LeadsOverTimeChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ChartCard title="Leads over time">
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={tipStyle} />
          <Area
            type="monotone"
            dataKey="value"
            name="Leads"
            stroke="#2563eb"
            fill="#93c5fd"
            fillOpacity={0.35}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function SpendOverTimeChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ChartCard title="Ad spend over time (₹)">
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={tipStyle} />
          <Area
            type="monotone"
            dataKey="value"
            name="Spend ₹"
            stroke="#059669"
            fill="#6ee7b7"
            fillOpacity={0.35}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function RevenueProfitChart({
  data,
}: {
  data: { label: string; revenue: number | null; profit: number | null }[];
}) {
  const chartData = data.map((d) => ({
    label: d.label,
    revenue: d.revenue ?? 0,
    profit: d.profit ?? 0,
    hasFinance: d.revenue != null,
  }));

  return (
    <ChartCard title="Revenue & profit (₹)">
      <p className="mb-2 text-xs text-zinc-500">
        Shown only when per-sale / product cost is set. Otherwise stays not
        mentioned.
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={tipStyle} />
          <Legend />
          <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={4} />
          <Bar dataKey="profit" name="Profit" fill="#059669" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function CampaignCompareChart({ data }: { data: ComparePoint[] }) {
  return (
    <ChartCard title="Campaign comparison">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="label"
            width={100}
            tick={{ fontSize: 11 }}
          />
          <Tooltip contentStyle={tipStyle} />
          <Legend />
          <Bar dataKey="spend" name="Spend ₹" fill="#2563eb" radius={4} />
          <Bar dataKey="leads" name="Leads" fill="#7c3aed" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ClientCompareChart({
  data,
  clientKeys,
}: {
  data: MultiClientPoint[];
  clientKeys: string[];
}) {
  const colors = ["#2563eb", "#059669", "#7c3aed", "#d97706", "#dc2626", "#0891b2"];
  return (
    <ChartCard title="All clients — leads comparison">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={tipStyle} />
          <Legend />
          {clientKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              name={key}
              fill={colors[i % colors.length]}
              radius={3}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="sp-card sp-shadow p-4 sm:p-5">
      <h3 className="mb-3 text-sm font-semibold text-zinc-900">{title}</h3>
      {children}
    </section>
  );
}
