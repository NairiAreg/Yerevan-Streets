import fetch from "node-fetch";
import fs from "fs/promises";

async function fetchYerevanStreets() {
  const query = `
    [out:json];
    area["name"="Երևան"]["admin_level"="4"]->.searchArea;
    (
      way["highway"]["name"](area.searchArea);
    );
    out body;
    >;
    out skel qt;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
    query
  )}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const nodes = new Map(
      data.elements
        .filter((element) => element.type === "node")
        .map((node) => [node.id, [node.lat, node.lon]])
    );

    const streets = data.elements
      .filter(
        (element) =>
          element.type === "way" &&
          element.tags &&
          element.tags.name &&
          element.tags.highway
      )
      .map((way) => ({
        name: way.tags["name:en"] || way.tags.name, // Prefer English name if available
        path: way.nodes.map((nodeId) => nodes.get(nodeId)).filter(Boolean),
      }))
      .filter((street) => street.path.length > 1);

    console.log("Total streets:", streets.length);

    // Save to JSON file
    await fs.writeFile(
      "yerevan_streets.json",
      JSON.stringify(streets, null, 2)
    );
    console.log("Data saved to yerevan_streets.json");

    return streets;
  } catch (error) {
    console.error("Error fetching or saving street data:", error);
    return [];
  }
}

fetchYerevanStreets();
