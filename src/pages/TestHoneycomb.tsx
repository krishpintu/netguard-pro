import React, { useEffect, useRef, useState } from "react";

export interface HostItem {
  name: string;
  lastvalue: string;
  itemid: string;
  groupid?: string;
}

interface HoneycombProps {
  items: HostItem[];
}

const BASE_CELL_WIDTH = 92;
const BASE_CELL_HEIGHT = 80;
const SMALL_CONTAINER_WIDTH = 200;

const TestHoneycomb: React.FC<HoneycombProps> = ({ items }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<HostItem[][]>([]);
  const [cellSize, setCellSize] = useState({
    width: BASE_CELL_WIDTH,
    height: BASE_CELL_HEIGHT,
  });

  const hoverScale = 2.2;

  /* =====================================================
     EDGE-AWARE HOVER TRANSFORM
  ===================================================== */
  const applyHoverTransform = (
    cell: HTMLDivElement,
    container: HTMLDivElement,
    scale: number,
  ) => {
    const cellRect = cell.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const scaledWidth = cellRect.width * scale;
    const scaledHeight = cellRect.height * scale;

    let translateX = 0;
    let translateY = 0;

    const overflowLeft =
      containerRect.left - (cellRect.left - (scaledWidth - cellRect.width) / 2);
    const overflowRight =
      cellRect.right + (scaledWidth - cellRect.width) / 2 - containerRect.right;
    const overflowTop =
      containerRect.top - (cellRect.top - (scaledHeight - cellRect.height) / 2);
    const overflowBottom =
      cellRect.bottom +
      (scaledHeight - cellRect.height) / 2 -
      containerRect.bottom;

    if (overflowLeft > 0) translateX += overflowLeft;
    if (overflowRight > 0) translateX -= overflowRight;
    if (overflowTop > 0) translateY += overflowTop;
    if (overflowBottom > 0) translateY -= overflowBottom;

    // Set transform and z-index
    cell.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    cell.style.zIndex = "1000"; // ensures hovered cell is on top
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const buildGrid = (width: number, height: number) => {
      if (width < SMALL_CONTAINER_WIDTH) {
        setRows(items.map((item) => [item]));
        setCellSize({
          width: BASE_CELL_WIDTH,
          height: BASE_CELL_HEIGHT,
        });
        return;
      }

      const horizontalOffset = -0.13 * BASE_CELL_WIDTH;
      const maxPerRow = Math.max(
        1,
        Math.floor(width / (BASE_CELL_WIDTH + horizontalOffset)),
      );

      const result: HostItem[][] = [];
      let index = 0;
      let toggle = true;

      while (index < items.length) {
        const rowLength = toggle ? maxPerRow : Math.max(1, maxPerRow - 1);
        result.push(items.slice(index, index + rowLength));
        index += rowLength;
        toggle = !toggle;
      }

      const longestRow = Math.max(...result.map((r) => r.length));
      const horizontalGap = BASE_CELL_WIDTH * 0.88;
      const availableWidth =
        width - (longestRow - 1) * (horizontalGap - BASE_CELL_WIDTH);
      const dynamicWidth = Math.min(
        BASE_CELL_WIDTH * 2,
        availableWidth / longestRow,
      );
      const dynamicHeight = (BASE_CELL_HEIGHT / BASE_CELL_WIDTH) * dynamicWidth;

      setCellSize({ width: dynamicWidth, height: dynamicHeight });
      setRows(result);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        buildGrid(width, height);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [items]);

  const horizontalGap = cellSize.width * 0.88;

  return (
    <div ref={containerRef} className="honeycomb-wrapper w-full h-full">
      <style>{`
        .honeycomb-wrapper {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          width: 100%;
          height: 100%;
          overflow-x: hidden;
          overflow-y: auto;
          padding-bottom: 10px;
        }

        .honeycomb-row {
          display: flex;
        }

        .honeycomb-cell-wrapper {
          position: relative;
          clip-path: polygon(
            50% 0%, 93% 25%, 93% 75%,
            50% 100%, 7% 75%, 7% 25%
          );
          transition: transform 0.35s ease;
          transform-origin: center;
          z-index: 1;
        }

        .honeycomb-cell {
          position: absolute;
          inset: 1px;
          clip-path: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
      `}</style>

      {rows.map((row, rowIndex) => {
        const isOddRow = rowIndex % 2 !== 0;

        return (
          <div
            key={rowIndex}
            className="honeycomb-row"
            style={{
              paddingLeft: isOddRow ? horizontalGap / 2 : 0,
              marginBottom: -cellSize.height * 0.23,
            }}
          >
            {row.map((item) => {
              const isUp = item.lastvalue === "1";

              return (
                <div
                  key={item.itemid}
                  className="honeycomb-cell-wrapper"
                  style={{
                    width: cellSize.width,
                    height: cellSize.height,
                    marginRight: horizontalGap - cellSize.width,
                    background: isUp ? "#245414" : "#c4430d",
                  }}
                  onMouseEnter={(e) => {
                    if (!containerRef.current) return;
                    applyHoverTransform(
                      e.currentTarget,
                      containerRef.current,
                      hoverScale,
                    );
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.zIndex = "1"; // reset z-index
                  }}
                >
                  <div
                    className="honeycomb-cell"
                    style={{
                      backgroundColor: isUp ? "#347b1c" : "#ff5b11",
                      color: "white",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        padding: "15px",
                        textAlign: "center",
                        width: "100%",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default TestHoneycomb;
