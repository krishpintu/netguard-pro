import React, { useEffect, useRef, useState } from "react";

export interface HostItem {
  name: string;
  lastvalue: string;
  itemid: string;
  groupid?: string;
}

interface HoneycombProps {
  items: HostItem[];
  cardWidth: number;
  cardHeight: number;
}

const MAX_CELL_WIDTH = 150;
const MAX_CELL_HEIGHT = 130;
const BASE_CELL_WIDTH = 80;
const BASE_CELL_HEIGHT = 70;

// 🔽 Narrow container rules
const SMALL_CONTAINER_WIDTH = 200;
const SMALL_CELL_WIDTH = 92;
const SMALL_CELL_HEIGHT = 80;

const TestHoneycomb: React.FC<HoneycombProps> = ({ items }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<HostItem[][]>([]);
  const [cellSize, setCellSize] = useState({
    width: BASE_CELL_WIDTH,
    height: BASE_CELL_HEIGHT,
  });

  const isSmallGroup = items.length < 5;
  const isMediumGroup = items.length >= 5 && items.length < 12;
  const hoverScale = 2.2;
  const basePadding = 5;

  useEffect(() => {
    if (!containerRef.current) return;

    const buildRows = (width: number, height: number) => {
      /* =====================================================
         🔴 FORCE FIXED SIZE WHEN CONTAINER < 200px
      ===================================================== */
      if (width < SMALL_CONTAINER_WIDTH) {
        setCellSize({
          width: SMALL_CELL_WIDTH,
          height: SMALL_CELL_HEIGHT,
        });

        // One cell per row (safe for very narrow layouts)
        const result: HostItem[][] = items.map((item) => [item]);
        setRows(result);
        return;
      }

      /* =====================================================
         🟢 NORMAL RESPONSIVE BEHAVIOR
      ===================================================== */

      let baseWidth = isSmallGroup
        ? Math.min(Math.max(120, width * 0.3), MAX_CELL_WIDTH)
        : isMediumGroup
          ? Math.min(Math.max(BASE_CELL_WIDTH, width * 0.25), MAX_CELL_WIDTH)
          : Math.min(Math.max(BASE_CELL_WIDTH, width * 0.2), MAX_CELL_WIDTH);

      let baseHeight = isSmallGroup
        ? Math.min(Math.max(110, height * 0.3), MAX_CELL_HEIGHT)
        : isMediumGroup
          ? Math.min(Math.max(BASE_CELL_HEIGHT, height * 0.25), MAX_CELL_HEIGHT)
          : Math.min(Math.max(BASE_CELL_HEIGHT, height * 0.2), MAX_CELL_HEIGHT);

      const horizontalOffset = -0.13 * baseWidth;
      let maxPerRow = Math.floor(width / (baseWidth + horizontalOffset));
      maxPerRow = Math.max(1, Math.min(maxPerRow, items.length));

      const effectiveWidth = width / maxPerRow - horizontalOffset;
      baseWidth = Math.min(effectiveWidth, MAX_CELL_WIDTH);

      const scale = baseWidth / BASE_CELL_WIDTH;
      baseHeight = Math.min(BASE_CELL_HEIGHT * scale, MAX_CELL_HEIGHT);

      setCellSize({ width: baseWidth, height: baseHeight });

      const result: HostItem[][] = [];
      let index = 0;
      let toggle = true;

      while (index < items.length) {
        const rowLength = toggle ? maxPerRow : Math.max(1, maxPerRow - 1);
        result.push(items.slice(index, index + rowLength));
        index += rowLength;
        toggle = !toggle;
      }

      setRows(result);
    };

    buildRows(
      containerRef.current.offsetWidth,
      containerRef.current.offsetHeight,
    );

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        buildRows(width, height);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [items, isSmallGroup, isMediumGroup]);

  return (
    <div ref={containerRef} className="honeycomb-wrapper w-full h-full">
      <style>{`
        .honeycomb-wrapper {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-start;
          width: 100%;
          height: 100%;
        }

        .honeycomb-row {
          display: flex;
          justify-content: flex-start;
          width: 100%;
        }

        .honeycomb-cell-wrapper {
          position: relative;
          clip-path: polygon(
            50% 0%, 93% 25%, 93% 75%,
            50% 100%, 7% 75%, 7% 25%
          );
          background: transparent;
          transition: transform 0.35s ease;
        }

        .honeycomb-cell-wrapper:hover {
          background: var(--border-color);
          z-index: 20;
        }

        .honeycomb-cell {
          position: absolute;
          inset: 1px;
          clip-path: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.35s ease;
        }
      `}</style>

      {rows.map((row, rowIndex) => {
        const isOddRow = rowIndex % 2 !== 0;
        const horizontalOffset = -0.13 * cellSize.width;

        const rowPaddingLeft = isOddRow
          ? basePadding + (cellSize.width + horizontalOffset) / 2
          : basePadding;

        return (
          <div
            key={rowIndex}
            className="honeycomb-row"
            style={{
              paddingLeft: rowPaddingLeft,
              paddingRight: basePadding,
              flexWrap: items.length < 5 ? "wrap" : "nowrap",
            }}
          >
            {row.map((item) => {
              const isUp = item.lastvalue === "1";
              const verticalOverlap = cellSize.height * 0.25;

              return (
                <div
                  key={item.itemid}
                  className="honeycomb-cell-wrapper"
                  style={
                    {
                      width: cellSize.width,
                      height: cellSize.height,
                      marginBottom: -verticalOverlap,
                      marginLeft: horizontalOffset,
                      "--border-color": isUp ? "#245414" : "#c4430d",
                    } as React.CSSProperties
                  }
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = `scale(${hoverScale})`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <div
                    className="honeycomb-cell"
                    style={{
                      backgroundColor: isUp ? "#347b1c" : "#ff5b11",
                      color: "white",
                    }}
                  >
                    <div className="flex flex-col items-center justify-center text-center px-1 w-full">
                      <span
                        className="block w-full p-4 text-sm overflow-hidden whitespace-nowrap text-ellipsis"
                        style={{
                          fontSize: items.length < 5 ? "14px" : "12px",
                        }}
                      >
                        {item.name.length > 20
                          ? item.name.slice(0, 20) + "..."
                          : item.name}
                      </span>
                    </div>
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
