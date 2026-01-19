import { useEffect, useState } from "react";
import axios from "axios";
import sampleFile from "../assets/samples/sample-host-upload.xlsx";
import * as XLSX from "xlsx";

interface Group {
  groupid: string;
  name: string;
}

interface Host {
  hostid: string;
  host: string;
  name: string;
  ip: string;
  group: string;
}

export default function HostOnboarding() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("single"); // default selected
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    host: "",
    name: "",
    ip: "",
    groupid: "",
    configType: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  /* ---------------- FETCH GROUPS + HOSTS ---------------- */
  // useEffect(() => {
  //   if (effectRan.current) return;
  //   effectRan.current = true;

  //   const token = sessionStorage.getItem("authToken");
  //   if (!token) {
  //     setError("No auth token found");
  //     setLoading(false);
  //     return;
  //   }

  //   const fetchAll = async () => {
  //     setLoading(true);
  //     try {
  //       const groupRes = await axios.post(
  //         baseUrl,
  //         {
  //           jsonrpc: "2.0",
  //           method: "hostgroup.get",
  //           params: {
  //             output: ["groupid", "name"],
  //             selectHosts: ["hostid", "host", "name"],
  //           },
  //           id: 1,
  //         },
  //         {
  //           headers: {
  //             "Content-Type": "application/json",
  //             Authorization: `Bearer ${token}`,
  //           },
  //         }
  //       );

  //       const groupData = groupRes.data.result || [];
  //       setGroups(groupData);

  //       // Flatten hosts array
  //       const allHosts = groupData.flatMap((group: any) =>
  //         (group.hosts || []).map((host: any) => ({
  //           hostid: host.hostid,
  //           host: host.host,
  //           name: host.name,
  //           ip: host.host, // Assuming host.host is the IP
  //           group: group.name,
  //         }))
  //       );

  //       setHosts(allHosts);
  //     } catch (err) {
  //       console.error(err);
  //       setError("Failed to load data");
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchAll();
  // }, [baseUrl]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("authToken");
      if (!token) throw new Error("Session expired");

      const groupRes = await axios.post(
        baseUrl,
        {
          jsonrpc: "2.0",
          method: "hostgroup.get",
          params: {
            output: ["groupid", "name"],
            selectHosts: ["hostid", "host", "name"],
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

      const groupData = groupRes.data.result || [];
      setGroups(groupData);

      // Flatten hosts array
      const allHosts = groupData.flatMap((group: any) =>
        (group.hosts || []).map((host: any) => ({
          hostid: host.hostid,
          host: host.host,
          name: host.name,
          ip: host.host, // Assuming host.host is the IP
          group: group.name,
        }))
      );

      setHosts(allHosts);
    } catch (err) {
      console.error(err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAll();
  }, [baseUrl]);

  /* ---------------- SUBMIT HOST ---------------- */
  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = sessionStorage.getItem("authToken");
    if (!token) {
      alert("Session expired. Please login again.");
      return;
    }

    try {
      if (activeTab === "single") {
        // ---------------- SINGLE HOST ----------------
        await createHost(form, token);
        alert("Host onboarded successfully ✅");

        // reset form
        setForm({
          host: "",
          name: "",
          ip: "",
          groupid: "",
          configType: "",
        });
        setOpen(false);
        fetchAll();
      } else if (activeTab === "bulk") {
        // ---------------- BULK UPLOAD ----------------
        if (!bulkFile) {
          alert("Please select a file to upload");
          return;
        }

        // Read Excel file (xlsx)
        const data = await bulkFile.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet); // returns array of objects
        // console.log(rows);
        type ExcelRow = {
          HOST: string;
          "Visible Name": string;
          "IP Address": string;
          "Configuration Type": string;
          "Host Group": string;
        };

        const typedRows = rows as ExcelRow[];

        // Loop through each row in the Excel file
        for (const row of typedRows) {
          // Map Excel columns to your host form fields
          const hostForm = {
            host: row["HOST"], // Excel column "HOST"
            name: row["Visible Name"], // Excel column "Visible Name"
            ip: row["IP Address"], // Excel column "IP Address"
            configType: row["Configuration Type"], // Excel column "Configuration Type"
            groupid: row["Host Group"], // Excel column "Host Group"
          };

          try {
            await createHost(hostForm, token);
          } catch (err) {
            console.error("Failed to create host:", hostForm.host, err);
          }
        }

        // After all rows processed
        alert("Bulk hosts uploaded successfully ✅");
        setBulkFile(null);
        setOpen(false);
        fetchAll();
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong while creating host(s)");
    }
  };

  const createHost = async (hostForm: typeof form, token: string) => {
    // Determine template name
    let templateName = "";
    if (hostForm.configType === "ICMP") templateName = "ICMP Ping";
    else if (hostForm.configType === "SNMP") templateName = "SNMP Interface";

    // Fetch template ID
    const templateResponse = await axios.post(
      baseUrl,
      {
        jsonrpc: "2.0",
        method: "template.get",
        params: { filter: { name: [templateName] }, output: ["templateid"] },
        id: 2,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (
      !templateResponse.data.result ||
      templateResponse.data.result.length === 0
    ) {
      throw new Error(`Template not found for ${hostForm.configType}`);
    }

    const templateId = templateResponse.data.result[0].templateid;

    // Create host
    const payload = {
      jsonrpc: "2.0",
      method: "host.create",
      params: {
        host: hostForm.host,
        name: hostForm.name,
        groups: [{ groupid: hostForm.groupid }],
        interfaces: [
          {
            type: 1,
            main: 1,
            useip: 1,
            ip: hostForm.ip,
            dns: "",
            port: "10050",
          },
        ],
        templates: [{ templateid: templateId }],
      },
      id: 3,
    };

    const response = await axios.post(baseUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data.error) {
      throw new Error(response.data.error.data || "Failed to create host");
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="p-2 bg-gray-100 h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-gray-800">Host Onboarding</h1>

        <button
          onClick={() => setOpen(true)}
          className="bg-[#1a3d73] text-white px-5 py-2 rounded-xl font-semibold shadow hover:bg-blue-700 transition"
        >
          + Add Host
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-gray-400">Loading...</p>
        ) : error ? (
          <p className="p-6 text-center text-red-500">{error}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#1a3d73] text-white">
              <tr>
                <th className="p-3 text-left">Host</th>
                <th className="p-3 text-left">Visible Name</th>
                <th className="p-3 text-left">IP</th>
                <th className="p-3 text-left">Group</th>
              </tr>
            </thead>
            <tbody>
              {hosts.length ? (
                hosts.map((h) => (
                  <tr key={h.hostid} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{h.host}</td>
                    <td className="p-3">{h.name}</td>
                    <td className="p-3">{h.ip}</td>
                    <td className="p-3">{h.group}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-400">
                    No hosts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ---------------- MODAL ---------------- */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={submitForm}
            className="bg-white w-full max-w-2xl rounded-2xl p-4 shadow-xl relative animate-scaleIn"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-700 bg-white shadow-md hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition"
            >
              ✕
            </button>

            {/* Header */}
            <div className="mb-4 text-left">
              <h3 className="text-xl font-bold text-gray-800">Add Host</h3>
              {/* <p className="text-sm text-gray-500 mt-1">
                Configure and onboard a new host
              </p> */}
            </div>

            {/* ---------- NEW: TABS ---------- */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab("single")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition
            ${
              activeTab === "single"
                ? "bg-white shadow text-blue-700"
                : "text-gray-500"
            }`}
              >
                Single Host
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("bulk")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition
            ${
              activeTab === "bulk"
                ? "bg-white shadow text-blue-700"
                : "text-gray-500"
            }`}
              >
                Bulk Upload
              </button>
            </div>

            {/* Divider */}
            <div className="border-b mb-6"></div>

            {/* ---------- SINGLE HOST FORM ---------- */}
            {activeTab === "single" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Host */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Host (unique)
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    required
                  />
                </div>

                {/* Visible Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visible Name
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                {/* IP Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IP Address
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
                    value={form.ip}
                    onChange={(e) => setForm({ ...form, ip: e.target.value })}
                    required
                  />
                </div>

                {/* Configuration Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Configuration Type
                  </label>
                  <select
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
                    value={form.configType}
                    onChange={(e) =>
                      setForm({ ...form, configType: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="ICMP">ICMP</option>
                    <option value="SNMP">SNMP</option>
                  </select>
                </div>

                {/* Group */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Host Group
                  </label>
                  <select
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
                    value={form.groupid}
                    onChange={(e) =>
                      setForm({ ...form, groupid: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Group</option>
                    {groups.map((g) => (
                      <option key={g.groupid} value={g.groupid}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* ---------- BULK UPLOAD ---------- */}
            {activeTab === "bulk" && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload CSV File
                  </label>
                  <input
                    type="file"
                    accept=".xlsx"
                    className="w-full border rounded-lg p-3"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setBulkFile(file);
                      }
                    }}
                    required
                  />
                </div>

                <div className="border rounded-xl p-4 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Sample File
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Download the sample Excel file to see the required format
                    for bulk upload.
                  </p>

                  <a
                    href={sampleFile}
                    download
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                  >
                    📥 Download Sample File
                  </a>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8">
              <button
                type="submit"
                className="w-[20%] bg-[#1a3d73] text-white py-3 rounded-xl font-semibold
           hover:bg-blue-700 transition shadow-md"
              >
                {activeTab === "single" ? "Onboard Host" : "Upload Hosts"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
