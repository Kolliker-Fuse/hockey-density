/* global dscc */
// D3 v7 via CDN (ESM import)
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/** Convert Looker Studio rows into {x,y} points.
 *  Using dscc.objectTransform, each row exposes fields by their field IDs.
 *  Our manifest defines ids "x" and "y".
 */
function rowsToPoints(table) {
  if (!table || !Array.isArray(table)) return [];
  return table
    .map(r => ({ x: +r["x"], y: +r["y"] }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
}

function draw(el, data, config) {
  el.innerHTML = "";

  const width = el.clientWidth || 640;
  const height = el.clientHeight || 400;

  const svg = d3.select(el).append("svg")
    .attr("width", width)
    .attr("height", height);

  const points = rowsToPoints(data.tables.DEFAULT);

  // Default NHL half-rink coordinate domains. Adjust later if needed.
  const x = d3.scaleLinear().domain([-100, 100]).range([0, width]);
  const y = d3.scaleLinear().domain([-42.5, 42.5]).range([height, 0]);

  // Optional background rink image
  if (config.showRink) {
    svg.append("image")
      .attr("href", "rink.png")
      .attr("x", 0).attr("y", 0)
      .attr("width", width).attr("height", height)
      .attr("opacity", 0.35);
  }

  // Density contours
  const bandwidth = Number(config.bandwidth) || 22;
  const levels = Number(config.levels) || 12;

  const contours = d3.contourDensity()
    .x(d => x(d.x))
    .y(d => y(d.y))
    .size([width, height])
    .bandwidth(bandwidth)
    .thresholds(levels)(points);

  const maxV = d3.max(contours, d => d.value) || 1;
  const color = d3.scaleSequential(d3.interpolateTurbo).domain([0, maxV]);

  svg.append("g")
    .selectAll("path")
    .data(contours)
    .join("path")
      .attr("d", d3.geoPath())
      .attr("fill", d => color(d.value))
      .attr("fill-opacity", 0.65)
      .attr("stroke", "none");
}

// Hook into the Community Viz lifecycle
function subscribe() {
  dscc.subscribeToData(msg => {
    const el = document.getElementById("app") || (() => {
      const div = document.createElement("div");
      div.id = "app";
      div.style.width = "100%";
      div.style.height = "100%";
      document.body.appendChild(div);
      return div;
    })();

    const data = msg.data;
    const config = {
      bandwidth: msg.config.bandwidth,
      levels: msg.config.levels,
      showRink: msg.config.showRink
    };
    draw(el, data, config);
  }, { transform: dscc.objectTransform });
}

document.addEventListener("DOMContentLoaded", subscribe);
