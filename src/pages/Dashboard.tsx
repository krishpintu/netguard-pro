import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import TestHoneycomb from "./TestHoneycomb";
import { Resizable } from "re-resizable";
import { useTheme } from "../features/ThemeContext";
import { FaEdit, FaCheck, FaTimes } from "react-icons/fa";

interface Host {
  hostid: string;
  host: string;
  name: string;
}

interface GroupItem {
  itemid: string;
  key_: string;
  hosts: Host[];
  lastvalue: string;
}

interface HostGroup {
  groupid: string;
  name: string;
  hosts: Host[];
  items?: GroupItem[];
}

const Dashboard: React.FC = () => {
  const { bgColor, textColor, headerBgColor } = useTheme();

  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<HostGroup[]>([]);
  const [submittedGroups, setSubmittedGroups] = useState<HostGroup[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSettingVisible, setIsSettingVisible] = useState<boolean>(false);

  const [cardSizes, setCardSizes] = useState<
    Record<string, { width: number; height: number; x: number; y: number }>
  >({});

  // ✅ EDIT MODE
  const [isEditMode, setIsEditMode] = useState(false);

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const effectRan = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /** FETCH HOST GROUPS **/
  useEffect(() => {
    if (effectRan.current) return;
    effectRan.current = true;

    const fetchHostGroups = async () => {
      const token = sessionStorage.getItem("authToken");
      if (!token) {
        setError("No auth token found. Please login.");
        setLoading(false);
        return;
      }

      const data = {
        jsonrpc: "2.0",
        method: "hostgroup.get",
        params: {
          output: ["groupid", "name"],
          selectHosts: ["hostid", "host", "name"],
        },
        id: 1,
      };

      try {
        const response = await axios.post(baseUrl, data, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        setHostGroups(
          (response.data.result || []).filter(
            (group: HostGroup) => group.hosts && group.hosts.length > 0,
          ),
        );
      } catch (err) {
        console.error(err);
        setError("Failed to fetch host groups");
      } finally {
        setLoading(false);
      }
    };

    fetchHostGroups();
  }, [baseUrl]);

  /** TOGGLE SELECTED GROUPS **/
  const toggleGroup = (group: HostGroup) => {
    if (selectedGroups.find((g) => g.groupid === group.groupid)) {
      setSelectedGroups(
        selectedGroups.filter((g) => g.groupid !== group.groupid),
      );
    } else {
      setSelectedGroups([...selectedGroups, group]);
    }
  };

  /** FETCH ITEMS FOR GROUPS **/
  const fetchGroupItems = async (groups: HostGroup[]) => {
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
            output: ["itemid", "key_", "lastvalue"],
            selectHosts: ["name"],
          },
          id: 1,
        };

        const response = await axios.post(baseUrl, data, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        return {
          ...group,
          items: response.data.result || [],
        };
      });

      return await Promise.all(promises);
    } catch (err) {
      console.error("Failed to fetch items:", err);
      return groups;
    }
  };

  /** HANDLE SUBMIT **/
  const handleSubmit = async () => {
    setDropdownOpen(false);
    localStorage.setItem("selectedGroups", JSON.stringify(selectedGroups));

    const groupsWithItems = await fetchGroupItems(selectedGroups);
    setSubmittedGroups(groupsWithItems);

    // ✅ Ensure valid container width
    const containerWidth =
      containerRef.current?.offsetWidth && containerRef.current.offsetWidth > 0
        ? containerRef.current.offsetWidth
        : 1000;

    const gap = 24;

    const newCardSizes: Record<
      string,
      { width: number; height: number; x: number; y: number }
    > = {};

    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;

    groupsWithItems.forEach((group) => {
      const { width, height } = getDefaultCardSize(group);

      // ⬇️ move to next row correctly
      if (currentX + width > containerWidth) {
        currentX = 0;
        currentY += rowHeight + gap;
        rowHeight = 0;
      }

      newCardSizes[group.groupid] = {
        width,
        height,
        x: currentX,
        y: currentY,
      };

      currentX += width + gap;
      rowHeight = Math.max(rowHeight, height);
    });

    setCardSizes(newCardSizes);
    localStorage.setItem("cardSizes", JSON.stringify(newCardSizes));

    sessionStorage.setItem("selectSettingVisible", String(!isSettingVisible));
  };

  /** AUTO REFRESH **/
  useEffect(() => {
    if (submittedGroups.length === 0) return;

    const interval = setInterval(async () => {
      const updatedGroups = await fetchGroupItems(submittedGroups);
      setSubmittedGroups(updatedGroups);
    }, 30000);

    return () => clearInterval(interval);
  }, [submittedGroups]);

  /** DEFAULT CARD SIZE **/
  const getDefaultCardSize = (group: HostGroup) => {
    const count = group.items?.length || 0;
    if (count === 4) return { width: 301, height: 279 };
    if (count > 4) return { width: 482, height: 288 };
    return { width: 300, height: 250 };
  };

  /** LOAD FROM LOCALSTORAGE AND APPLY LAYOUT */
  useEffect(() => {
    let cancelled = false;

    const initLayout = async () => {
      const storedGroups = localStorage.getItem("selectedGroups");
      const storedCardSizes = localStorage.getItem("cardSizes");

      if (!storedGroups) return;

      const parsedGroups: HostGroup[] = JSON.parse(storedGroups);
      setSelectedGroups(parsedGroups);

      const groupsWithItems = await fetchGroupItems(parsedGroups);
      if (cancelled) return;

      setSubmittedGroups(groupsWithItems);

      // ✅ container width
      const containerWidth =
        containerRef.current?.offsetWidth &&
        containerRef.current.offsetWidth > 0
          ? containerRef.current.offsetWidth
          : 1000;

      const gap = 24;

      /** --------------------------------------------------
       * CASE 1: Stored cardSizes exist → use them
       * -------------------------------------------------- */
      if (storedCardSizes) {
        const parsedSizes: Record<
          string,
          { width: number; height: number; x: number; y: number }
        > = JSON.parse(storedCardSizes);

        const normalized: typeof parsedSizes = {};
        let currentX = 0;
        let currentY = 0;
        let rowHeight = 0;

        groupsWithItems.forEach((group) => {
          const saved = parsedSizes[group.groupid];
          const { width, height } = saved ?? getDefaultCardSize(group);

          // If currentX + width exceeds container → move to next row
          if (currentX + width > containerWidth) {
            currentX = 0;
            currentY += rowHeight + gap;
            rowHeight = 0;
          }

          normalized[group.groupid] = {
            width,
            height,
            x: saved?.x ?? currentX,
            y: saved?.y ?? currentY,
          };

          currentX += width + gap;
          rowHeight = Math.max(rowHeight, height);
        });

        setCardSizes(normalized);
        return;
      }

      /** --------------------------------------------------
       * CASE 2: No stored layout → fresh grid layout
       * -------------------------------------------------- */
      const newSizes: Record<
        string,
        { width: number; height: number; x: number; y: number }
      > = {};
      let currentX = 0;
      let currentY = 0;
      let rowHeight = 0;

      groupsWithItems.forEach((group) => {
        const { width: w, height: h } = getDefaultCardSize(group);

        if (currentX + w > containerWidth) {
          currentX = 0;
          currentY += rowHeight + gap;
          rowHeight = 0;
        }

        newSizes[group.groupid] = {
          width: w,
          height: h,
          x: currentX,
          y: currentY,
        };

        currentX += w + gap;
        rowHeight = Math.max(rowHeight, h);
      });

      setCardSizes(newSizes);
    };

    initLayout();

    // Restore settings visibility
    const storedSetting = sessionStorage.getItem("selectSettingVisible");
    setIsSettingVisible(storedSetting === "true");

    return () => {
      cancelled = true;
    };
  }, []);

  /** SAVE CARD SIZES **/
  // useEffect(() => {
  //   if (Object.keys(cardSizes).length > 0) {
  //     localStorage.setItem("cardSizes", JSON.stringify(cardSizes));
  //   }
  // }, [cardSizes]);

  useEffect(() => {
    const storedGroups = localStorage.getItem("selectedGroups");
    if (storedGroups) {
      const parsedGroups = JSON.parse(storedGroups);
      setSelectedGroups(parsedGroups);
      fetchGroupItems(parsedGroups).then((groupsWithItems) => {
        setSubmittedGroups(groupsWithItems);
      });
    }
    const interval = setInterval(() => {
      const stored = sessionStorage.getItem("selectSettingVisible");
      setIsSettingVisible(stored === "true");
    }, 100); // every 100ms

    return () => clearInterval(interval);
  }, []);

  const handleSaveLayout = () => {
    localStorage.setItem("cardSizes", JSON.stringify(cardSizes));
    setIsEditMode(false);
  };

  const handleCancelEdit = () => {
    const stored = localStorage.getItem("cardSizes");
    if (stored) {
      setCardSizes(JSON.parse(stored)); // revert changes
    }
    setIsEditMode(false);
  };

  if (loading)
    return <div className="p-4 text-center text-gray-500">Loading...</div>;
  if (error)
    return (
      <div className="p-4 text-center text-red-500 font-semibold">
        Error: {error}
      </div>
    );

  /** RENDER **/
  return (
    <div
      className="w-full p-4 h-full relative"
      style={{ backgroundColor: bgColor }}
    >
      {/* DROPDOWN + SUBMIT */}
      {isSettingVisible && (
        <div>
          <h1 className="text-lg font-bold mb-2 text-gray-800">
            Select Host Groups
          </h1>
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <div className="relative" style={{ width: "30%" }}>
              <div
                className="border border-gray-300 rounded-xl p-2 cursor-pointer flex flex-wrap gap-2 bg-white shadow-sm hover:shadow-md transition-all"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {selectedGroups.length > 0 ? (
                  selectedGroups.map((group) => (
                    <span
                      key={group.groupid}
                      className="bg-[#1a3d73] text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-sm"
                    >
                      {group.name}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroup(group);
                        }}
                        className="hover:text-gray-200 transition"
                      >
                        ✕
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400">Select Host Groups</span>
                )}
              </div>

              {dropdownOpen && (
                <div className="absolute mt-2 w-full max-h-64 overflow-y-auto border border-gray-300 rounded-xl bg-white shadow-lg z-20">
                  {hostGroups.map((group) => (
                    <div
                      key={group.groupid}
                      className={`p-3 cursor-pointer hover:bg-blue-100 transition-all rounded-lg ${
                        selectedGroups.find((g) => g.groupid === group.groupid)
                          ? "bg-blue-50"
                          : ""
                      }`}
                      onClick={() => toggleGroup(group)}
                    >
                      {group.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              className="bg-[#1a3d73] text-white px-6 py-2 rounded-xl font-semibold hover:bg-blue-700 shadow-md transition"
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {/* ✅ EDIT / SAVE / CANCEL ICON BUTTONS */}
      <div className="absolute top-[-12px] right-2 z-50 flex gap-3">
        {!isEditMode ? (
          <button
            onClick={() => setIsEditMode(true)}
            title="Edit layout"
            className="w-8 h-8 flex items-center justify-center rounded-full
                 bg-blue-100 shadow-lg hover:bg-blue-200 transition"
          >
            <FaEdit className="text-blue-700" />
          </button>
        ) : (
          <>
            <button
              onClick={handleSaveLayout}
              title="Save layout"
              className="w-8 h-8 flex items-center justify-center rounded-full
                   bg-green-100 shadow-lg hover:bg-green-200 transition"
            >
              <FaCheck className="text-green-700" />
            </button>

            <button
              onClick={handleCancelEdit}
              title="Cancel"
              className="w-8 h-8 flex items-center justify-center rounded-full
                   bg-red-100 shadow-lg hover:bg-red-200 transition"
            >
              <FaTimes className="text-red-700" />
            </button>
          </>
        )}
      </div>

      {/* DASHBOARD CARDS */}
      <div className="relative w-full h-full" ref={containerRef}>
        {submittedGroups.map((group) => {
          const card = cardSizes[group.groupid] ?? {
            ...getDefaultCardSize(group),
            x: 0,
            y: 0,
          };

          const { width, height, x = 0, y = 0 } = card;

          const handleMouseDown = (e: React.MouseEvent) => {
            if (!isEditMode) return;
            const target = e.target as HTMLElement;
            if (target.closest(".resizable-handle")) return;

            e.preventDefault();
            const startX = e.clientX;
            const startY = e.clientY;
            const startPosX = x;
            const startPosY = y;

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const dx = moveEvent.clientX - startX;
              const dy = moveEvent.clientY - startY;

              setCardSizes((prev) => ({
                ...prev,
                [group.groupid]: {
                  ...prev[group.groupid],
                  x: startPosX + dx,
                  y: startPosY + dy,
                },
              }));
            };

            const handleMouseUp = () => {
              window.removeEventListener("mousemove", handleMouseMove);
              window.removeEventListener("mouseup", handleMouseUp);
            };

            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
          };
          const containerWidth = containerRef.current?.offsetWidth || 1000;

          return (
            <div
              key={group.groupid}
              style={{
                position: "absolute",
                transform: `translate(${x}px, ${y}px)`,
                cursor: isEditMode ? "grab" : "default",
              }}
            >
              <Resizable
                size={{ width, height }}
                enable={
                  isEditMode
                    ? {
                        top: true,
                        right: true,
                        bottom: true,
                        left: true,
                        topRight: true,
                        bottomRight: true,
                        bottomLeft: true,
                        topLeft: true,
                      }
                    : false
                }
                minWidth={150}
                minHeight={150}
                maxWidth={Math.max(150, containerWidth - x)}
                maxHeight={800}
                handleClasses={{
                  top: "resizable-handle",
                  right: "resizable-handle",
                  bottom: "resizable-handle",
                  left: "resizable-handle",
                  topRight: "resizable-handle",
                  bottomRight: "resizable-handle",
                  bottomLeft: "resizable-handle",
                  topLeft: "resizable-handle",
                }}
                onResizeStop={(_, __, ref) => {
                  if (!isEditMode) return;
                  setCardSizes((prev) => ({
                    ...prev,
                    [group.groupid]: {
                      ...prev[group.groupid],
                      width: ref.offsetWidth,
                      height: ref.offsetHeight,
                    },
                  }));
                }}
                style={{ backgroundColor: bgColor }}
                className="shadow-md hover:shadow-xl transition"
              >
                <div className="border h-full flex flex-col overflow-hidden">
                  <div
                    className="p-2 flex justify-between items-center flex-shrink-0"
                    style={{
                      backgroundColor: headerBgColor,
                      cursor: isEditMode ? "grab" : "default",
                    }}
                    onMouseDown={handleMouseDown}
                  >
                    <h2
                      className="text-sm font-bold truncate"
                      style={{ color: textColor }}
                    >
                      {group.name}
                    </h2>
                  </div>
                  <div className="p-2 flex-1 overflow-auto">
                    {group.items && group.items.length > 0 ? (
                      <TestHoneycomb
                        items={group.items
                          .filter((item) => item.key_ === "icmpping")
                          .flatMap((item) =>
                            item.hosts.map((host) => ({
                              ...host,
                              lastvalue: item.lastvalue,
                              itemid: item.itemid,
                            })),
                          )}
                        cardWidth={width}
                        cardHeight={height}
                      />
                    ) : (
                      <p className="text-gray-400 text-center text-sm">
                        No items found
                      </p>
                    )}
                  </div>
                </div>
              </Resizable>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
