/**
 * This example aims at showcasing sigma's performances.
 */

import Sigma from "sigma";
import Graph from "graphology";
import seedrandom from "seedrandom";

import EdgesDefaultProgram from "sigma/rendering/webgl/programs/edge";
import EdgesFastProgram from "sigma/rendering/webgl/programs/edge.fast";

import circlepack from "graphology-layout/circlepack";
import clusters from "graphology-generators/random/clusters";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import forceAtlas2 from "graphology-layout-forceatlas2";

import chroma from "chroma-js";
import { v4 as uuid } from "uuid";

const rng = seedrandom("sigma");

// 1. Read query string, and set form values accordingly:
const query = new URLSearchParams(location.search).entries();
for (const [key, value] of query) {
  const domList = document.getElementsByName(key);
  if (domList.length === 1) {
    (domList[0] as HTMLInputElement).value = value;
  } else if (domList.length > 1) {
    domList.forEach((dom: HTMLElement) => {
      const input = dom as HTMLInputElement;
      input.checked = input.value === value;
    });
  }
}

// 2. Read form values to build a full state:
const state = {
  order: +document.querySelector<HTMLInputElement>("#order")!?.value,
  size: +document.querySelector<HTMLInputElement>("#size")!?.value,
  clusters: +document.querySelector<HTMLInputElement>("#clusters")!?.value,
  edgesRenderer: document.querySelector<HTMLInputElement>(
    '[name="edges-renderer"]:checked'
  )?.value,
};

// 3. Generate a graph:
const graph = clusters(Graph, { ...state, rng });
console.log(graph.nodes(), graph.edges());

circlepack.assign(graph, {
  hierarchyAttributes: ["cluster"],
});
const colors: Record<string, string> = {};
for (let i = 0; i < +state.clusters; i++) {
  colors[i] = "#" + Math.floor(rng() * 16777215).toString(16);
}
let i = 0;
graph.forEachNode((node, { cluster }) => {
  graph.mergeNodeAttributes(node, {
    size: graph.degree(node) / 3,
    label: `Node n°${++i}, in cluster n°${cluster}`,
    color: colors[cluster + ""],
  });
});

// 4. Render the graph:
const container = document.getElementById("sigma-container") as HTMLElement;
const renderer = new Sigma(graph, container, {
  defaultEdgeColor: "#e6e6e6",
  defaultEdgeType: state.edgesRenderer,
  edgeProgramClasses: {
    "edges-default": EdgesDefaultProgram,
    "edges-fast": EdgesFastProgram,
  },
});

// 5. Enable FA2 button:
const fa2Button = document.getElementById("fa2") as HTMLButtonElement;
const sensibleSettings = forceAtlas2.inferSettings(graph);
const fa2Layout = new FA2Layout(graph, {
  settings: sensibleSettings,
});
function toggleFA2Layout() {
  if (fa2Layout.isRunning()) {
    fa2Layout.stop();
    fa2Button.innerHTML = `Start layout ▶`;
  } else {
    fa2Layout.start();
    fa2Button.innerHTML = `Stop layout ⏸`;
  }
}
fa2Button.addEventListener("click", toggleFA2Layout);

// Cheap trick: tilt the camera a bit to make labels more readable:
renderer.getCamera().setState({
  angle: 0.2,
});

// 添加事件

// State for drag'n'drop
let draggedNode: string | null = null;
let isDragging = false;

renderer.on("downNode", (e) => {
  isDragging = true;
  draggedNode = e.node;
  graph.setNodeAttribute(draggedNode, "highlighted", true);
  renderer.getCamera().disable();
});

// On mouse move, if the drag mode is enabled, we change the position of the draggedNode
renderer.getMouseCaptor().on("mousemovebody", (e) => {
  if (!isDragging || !draggedNode) return;

  // Get new position of node
  const pos = renderer.viewportToGraph(e);

  graph.setNodeAttribute(draggedNode, "x", pos.x);
  graph.setNodeAttribute(draggedNode, "y", pos.y);
});

// On mouse up, we reset the autoscale and the dragging mode
renderer.getMouseCaptor().on("mouseup", () => {
  if (draggedNode) {
    graph.removeNodeAttribute(draggedNode, "highlighted");
  }
  isDragging = false;
  draggedNode = null;
  renderer.getCamera().enable();
});

// Disable the autoscale at the first down interaction
renderer.getMouseCaptor().on("mousedown", () => {
  if (!renderer.getCustomBBox()) renderer.setCustomBBox(renderer.getBBox());
});


// Create node (and edge) by click

// When clicking on the stage, we add a new node and connect it to the closest node
// renderer.on("clickStage", ({ event }: { event: { x: number; y: number } }) => {
//   // Sigma (ie. graph) and screen (viewport) coordinates are not the same.
//   // So we need to translate the screen x & y coordinates to the graph one by calling the sigma helper `viewportToGraph`
//   const coordForGraph = renderer.viewportToGraph({ x: event.x, y: event.y });

//   // We create a new node
//   const node = {
//     ...coordForGraph,
//     size: 10,
//     color: chroma.random().hex(),
//   };

//   // Searching the two closest nodes to auto-create an edge to it
//   const closestNodes = graph
//     .nodes()
//     .map((nodeId) => {
//       const attrs = graph.getNodeAttributes(nodeId);
//       const distance =
//         Math.pow(node.x - attrs.x, 2) + Math.pow(node.y - attrs.y, 2);
//       return { nodeId, distance };
//     })
//     .sort((a, b) => a.distance - b.distance)
//     .slice(0, 2);

//   // We register the new node into graphology instance
//   const id = uuid();
//   graph.addNode(id, node);

//   // We create the edges
//   closestNodes.forEach((e) => graph.addEdge(id, e.nodeId));
// });
