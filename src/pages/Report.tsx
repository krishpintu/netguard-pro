import { useEffect, useState } from "react";
import axios from "axios";

interface HostWithValue {
  hostid: string;
  host: string;
  name: string;
  ip?: string;
  lastvalue: string; // "1" = Up, otherwise Down
}

interface Group {
  groupid: string;
  name: string;
  hosts?: HostWithValue[];
  items?: any[];
  totalHosts?: number;
  upCount?: number;
  downCount?: number;
}

interface Downtime {
  host: string;
  start: string;
  end: string;
  duration: string;
}

export default function Report() {
  const [activeTab, setActiveTab] = useState<"groups" | "downtime">("groups");
  const [groups, setGroups] = useState<Group[]>([]);
  const [downtimeHistory, setDowntimeHistory] = useState<Downtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedHost, setSelectedHost] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchGroupItems = async (groups: Group[]) => {
    const token = sessionStorage.getItem("authToken");
    if (!token) return groups;

    try {
      const promises = groups.map(async (group) => {
        const data = {
          jsonrpc: "2.0",
          method: "item.get",
          params: {
            groupids: [group.groupid],
            filter: { state: 0 },
            search: { key_: "icmpping" },
            output: ["itemid", "key_", "lastvalue", "hostid"],
          },
          id: 1,
        };

        const response = await axios.post(baseUrl, data, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const items: any[] = response.data.result || [];

        // Map hostid -> lastvalue (take the first item per host)
        const hostStatusMap: Record<string, string> = {};
        items.forEach((item) => {
          if (item.hostid && hostStatusMap[item.hostid] === undefined) {
            hostStatusMap[item.hostid] = item.lastvalue;
          }
        });

        let upCount = 0;
        let downCount = 0;

        group.hosts?.forEach((host) => {
          const status = hostStatusMap[host.hostid];
          if (status === "1") upCount++;
          else downCount++; // either "0" or no item
        });

        return {
          ...group,
          items,
          totalHosts: group.hosts?.length || 0,
          upCount,
          downCount,
        };
      });

      return await Promise.all(promises);
    } catch (err) {
      console.error("Failed to fetch items:", err);
      return groups;
    }
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("authToken");
      if (!token) throw new Error("Session expired");

      const data = {
        jsonrpc: "2.0",
        method: "hostgroup.get",
        params: {
          output: ["groupid", "name"],
          selectHosts: ["hostid", "host", "name"],
        },
        id: 1,
      };

      const response = await axios.post(baseUrl, data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      let groupData: Group[] = (response.data.result || []).filter(
        (group: any) => group.hosts && group.hosts.length > 0
      );
      groupData = await fetchGroupItems(groupData);
      setGroups(groupData);
    } catch (err) {
      console.error(err);
      setError("Failed to load host group data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDowntimeHistory = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("authToken");
      if (!token) throw new Error("Session expired");

      const time_from = fromDate
        ? Math.floor(new Date(fromDate + " 00:00:00").getTime() / 1000)
        : undefined;

      const time_till = toDate
        ? Math.floor(new Date(toDate + " 23:59:59").getTime() / 1000)
        : undefined;

      /* 1️⃣ Get ICMP triggers */
      const triggerRes = await axios.post(
        baseUrl,
        {
          jsonrpc: "2.0",
          method: "trigger.get",
          params: {
            output: ["triggerid"],
            selectHosts: ["host"],
            groupids: selectedGroup ? [selectedGroup] : undefined,
            monitored: true,
            search: { description: "ICMP" },
          },
          id: 1,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const triggers = triggerRes.data?.result || [];
      const history: Downtime[] = [];

      /* 2️⃣ Fetch events per trigger */
      for (const t of triggers) {
        const hostName = t.hosts?.[0]?.host;
        if (!hostName) continue;

        if (selectedHost && hostName !== selectedHost) continue;

        const eventRes = await axios.post(
          baseUrl,
          {
            jsonrpc: "2.0",
            method: "event.get",
            params: {
              output: ["clock", "value"],
              source: 0,
              object: 0,
              objectids: t.triggerid,
              time_from,
              time_till,
              sortfield: "clock",
              sortorder: "ASC",
            },
            id: 1,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const events = eventRes.data?.result || [];
        let lastDown: number | null = null;
        for (const e of events) {
          const ts = Number(e.clock);

          // DOWN event
          if (e.value === "1") {
            lastDown = ts;
            continue;
          }

          // UP event (recovery)
          if (e.value === "0" && lastDown !== null) {
            const duration = ts - lastDown;

            history.push({
              host: hostName,
              start: new Date(lastDown * 1000).toLocaleString(),
              end: new Date(ts * 1000).toLocaleString(),
              duration: `${Math.ceil(duration / 60)} min`,
            });

            lastDown = null;
          }
        }

        /* 3️⃣ If still DOWN at end of range */
        if (lastDown !== null && time_till) {
          const duration = time_till - lastDown;

          history.push({
            host: hostName,
            start: new Date(lastDown * 1000).toLocaleString(),
            end: new Date(time_till * 1000).toLocaleString(),
            duration: `${Math.ceil(duration / 60)} min`,
          });
        }
      }
      setDowntimeHistory(history);
    } catch (err) {
      console.error(err);
      setError("Failed to load downtime history");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSearch = () => {
    fetchDowntimeHistory();
  };

  useEffect(() => {
    fetchGroups();
    fetchDowntimeHistory();
  }, [baseUrl]);
  const hostsForSelectedGroup =
    groups.find((g) => g.groupid === selectedGroup)?.hosts || [];

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header / Tabs */}
      <div className="bg-gray-200 p-4 flex justify-start gap-4 rounded-b-xl shadow">
        <button
          onClick={() => setActiveTab("groups")}
          className={`py-2 px-4 rounded-lg text-sm font-semibold transition ${
            activeTab === "groups"
              ? "bg-white shadow text-blue-700"
              : "text-gray-500 hover:bg-gray-300"
          }`}
        >
          Host Group Details
        </button>
        <button
          onClick={() => setActiveTab("downtime")}
          className={`py-2 px-4 rounded-lg text-sm font-semibold transition ${
            activeTab === "downtime"
              ? "bg-white shadow text-blue-700"
              : "text-gray-500 hover:bg-gray-300"
          }`}
        >
          Downtime History
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <p className="text-center text-gray-400 mt-20">Loading...</p>
        ) : error ? (
          <p className="text-center text-red-500 mt-20">{error}</p>
        ) : activeTab === "groups" ? (
          // Host Group Table Full Page
          <div className="w-full h-full overflow-auto bg-white rounded-xl shadow p-4">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-[#1a3d73] text-white sticky top-0 z-10">
                <tr>
                  <th className="p-3 text-left">Sl No</th>
                  <th className="p-3 text-left">Group</th>
                  <th className="p-3 text-left">Total Hosts</th>
                  <th className="p-3 text-left">Total Up</th>
                  <th className="p-3 text-left">Total Down</th>
                </tr>
              </thead>
              <tbody>
                {groups.length ? (
                  groups.map((g, index) => (
                    <tr key={g.groupid} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{index + 1}</td>
                      <td className="p-3">{g.name}</td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-1 text-sm font-semibold bg-[#1a3d73] text-white rounded-full">
                          {g.totalHosts || 0}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-1 text-sm font-semibold bg-green-100 text-green-800 rounded-full">
                          {g.upCount || 0}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-1 text-sm font-semibold bg-red-100 text-red-800 rounded-full">
                          {g.downCount || 0}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-400">
                      No host groups found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          // Downtime Tab with Filters Full Page
          <div className="w-full h-full flex flex-col gap-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="p-2 border rounded-md"
              >
                <option value="">Select Group</option>
                {groups.map((g) => (
                  <option key={g.groupid} value={g.groupid}>
                    {g.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedHost}
                onChange={(e) => setSelectedHost(e.target.value)}
                className="p-2 border rounded-md"
                disabled={!selectedGroup}
              >
                <option value="">Select Host</option>
                {hostsForSelectedGroup.map((h: any) => (
                  <option key={h.itemid} value={h.host}>
                    {h.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="p-2 border rounded-md"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="p-2 border rounded-md"
              />

              <button
                onClick={handleFilterSearch}
                className="bg-[#1a3d73] text-white text-xs px-2 py-0.5 rounded-md hover:bg-blue-700 transition w-[100px]"
              >
                Search
              </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto bg-white rounded-xl shadow p-4">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-[#1a3d73] text-white sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-left">#</th>
                    <th className="p-3 text-left">Host</th>
                    <th className="p-3 text-left">Down From</th>
                    <th className="p-3 text-left">Up At</th>
                    <th className="p-3 text-left">Duration</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {downtimeHistory.length ? (
                    downtimeHistory.map((d, idx) => (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="p-3">{idx + 1}</td>

                        <td className="p-3 font-medium">{d.host}</td>

                        <td className="p-3 text-red-600 font-medium">
                          {d.start}
                        </td>

                        <td className="p-3 text-green-600 font-medium">
                          {d.end}
                        </td>

                        <td className="p-3 font-semibold">{d.duration}</td>

                        <td className="p-3">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            DOWN
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-400">
                        No downtime history found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
