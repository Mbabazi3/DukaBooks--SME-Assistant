import { GptClient } from "@gpt-platform/client";

// Each scenario is a different kind of "successful-looking" server reply.
// We always call the same SDK method: client.crm.contacts.get("con_123")
const scenarios = [
  {
    name: "A. Server replies 200 with BARE JSON (no { data: ... } wrapper)",
    respond: () =>
      new Response(JSON.stringify({ id: "con_123", first_name: "John" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
  },
  {
    name: "B. Server replies 200 with an HTML page (proxy / wrong baseUrl)",
    respond: () =>
      new Response("<html><body>Welcome!</body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" }
      })
  },
  {
    name: "C. Server replies 200 with an EMPTY JSON object {}",
    respond: () =>
      new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/vnd.api+json" }
      })
  },
  {
    name: "D. Server replies 200 with only pagination meta, no data",
    respond: () =>
      new Response(JSON.stringify({ meta: { page: 1, total: 0 } }), {
        status: 200,
        headers: { "Content-Type": "application/vnd.api+json" }
      })
  },
  {
    name: "E. Server replies 204 No Content (empty body)",
    respond: () => new Response(null, { status: 204 }),
  },
  {
    name: "F. Server replies 500 Internal Server Error (for contrast)",
    respond: () =>
      new Response(JSON.stringify({ errors: [{ title: "boom" }] }), {
        status: 500,
        headers: { "Content-Type": "application/vnd.api+json" }
      })
  }
];

for (const scenario of scenarios) {
  console.log("\n" + "-".repeat(70));
  console.log(scenario.name);

  const client = new GptClient({
    baseUrl: "https://api.gpt-core.com",
    fetch: async () => scenario.respond()
  });

  try {
    const result = await client.crm.contacts.get("con_123");
    console.log("RESULT:", result);
    if (result === undefined) {
      console.log(">>> SILENT FAILURE: request 'succeeded' but you got undefined, no error thrown");
    }
  } catch (err) {
    console.log("THROWN ERROR (good — at least you can see it):", err.code || err.message);
  }
}
