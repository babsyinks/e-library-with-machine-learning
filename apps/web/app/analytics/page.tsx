"use client";

import { BookCheck, Download, Eye, SearchX, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";

interface RankedResource {
  id: string;
  title: string;
  author: string;
  viewCount: number;
  downloadCount: number;
}

interface Overview {
  periodDays: number;
  summary: {
    users: number;
    approvedResources: number;
    pendingResources: number;
    views: number;
    downloads: number;
  };
  topViewed: RankedResource[];
  topDownloaded: RankedResource[];
  noResultSearches: Array<{ query: string; count: number }>;
  categoryEngagement: Array<{
    category: string;
    views: number;
    downloads: number;
  }>;
  trend: Array<{ day: string; views: number; downloads: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Overview>();
  const [days, setDays] = useState(30);

  useEffect(() => {
    setData(undefined);
    apiFetch<Overview>(`/analytics/overview?days=${days}`).then(setData);
  }, [days]);

  return (
    <AppShell
      roles={["LIBRARIAN", "ADMIN"]}
      title="Learning analytics"
      description="Aggregate signals that help the institution understand and improve its collection."
      action={
        <label className="period-select">
          Period
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </label>
      }
    >
      {!data ? (
        <div className="inline-loading">
          <span className="spinner" /> Preparing aggregate insights…
        </div>
      ) : (
        <>
          <div className="stat-grid stat-grid-five">
            <StatCard
              icon={Users}
              label="Registered users"
              value={data.summary.users}
            />
            <StatCard
              icon={BookCheck}
              label="Approved resources"
              value={data.summary.approvedResources}
              tone="gold"
            />
            <StatCard
              icon={Eye}
              label="Views in period"
              value={data.summary.views}
            />
            <StatCard
              icon={Download}
              label="Downloads in period"
              value={data.summary.downloads}
              tone="coral"
            />
            <StatCard
              icon={SearchX}
              label="Pending reviews"
              value={data.summary.pendingResources}
              tone="gold"
            />
          </div>

          <div className="analytics-grid">
            <section className="chart-card chart-wide">
              <div>
                <span className="eyebrow">Engagement over time</span>
                <h2>Views and downloads</h2>
              </div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.trend.map((row) => ({
                      ...row,
                      day: new Date(row.day).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      }),
                    }))}
                  >
                    <defs>
                      <linearGradient
                        id="viewGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#0b6557"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="#0b6557"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e9ede9" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                    />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="views"
                      stroke="#0b6557"
                      fill="url(#viewGradient)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="downloads"
                      stroke="#df6c55"
                      fill="transparent"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="chart-card">
              <div>
                <span className="eyebrow">Subject demand</span>
                <h2>Category engagement</h2>
              </div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.categoryEngagement}
                    layout="vertical"
                    margin={{ left: 15 }}
                  >
                    <CartesianGrid stroke="#edf0ed" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={95}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="views"
                      stackId="a"
                      fill="#0b6557"
                      radius={[0, 3, 3, 0]}
                    />
                    <Bar
                      dataKey="downloads"
                      stackId="a"
                      fill="#df6c55"
                      radius={[0, 3, 3, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="chart-card">
              <div>
                <span className="eyebrow">Catalog gaps</span>
                <h2>Searches with no results</h2>
              </div>
              {data.noResultSearches.length ? (
                <ol className="rank-list">
                  {data.noResultSearches.map((item) => (
                    <li key={item.query}>
                      <span>{item.query}</span>
                      <strong>{item.count}</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted">
                  No unsuccessful search terms in this period.
                </p>
              )}
            </section>

            <section className="chart-card">
              <div>
                <span className="eyebrow">Most used</span>
                <h2>Top resources</h2>
              </div>
              <RankedList
                title="By views"
                items={data.topViewed.slice(0, 3)}
                metric="views"
              />
              <RankedList
                title="By downloads"
                items={data.topDownloaded.slice(0, 3)}
                metric="downloads"
              />
            </section>
          </div>
          <p className="privacy-caption">
            Only aggregate trends are shown here. The dashboard does not reveal
            individual student activity.
          </p>
        </>
      )}
    </AppShell>
  );
}

function RankedList({
  title,
  items,
  metric,
}: {
  title: string;
  items: RankedResource[];
  metric: "views" | "downloads";
}) {
  return (
    <>
      <h3 className="mini-list-title">{title}</h3>
      <ol className="rank-list resource-rank">
        {items.map((item) => (
          <li key={item.id}>
            <span>
              <strong>{item.title}</strong>
              <small>{item.author}</small>
            </span>
            <em>
              {metric === "views" ? item.viewCount : item.downloadCount}{" "}
              {metric}
            </em>
          </li>
        ))}
      </ol>
    </>
  );
}
