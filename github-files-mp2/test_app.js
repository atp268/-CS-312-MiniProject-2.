// automated test runner for Cocktail Companion
const http = require("http");
const { spawn } = require("child_process");

const PORT = 3055;
process.env.PORT = PORT;

console.log(`Starting server on port ${PORT} for automated test verification...`);

const serverProcess = spawn("node", ["index.js"], {
  cwd: __dirname,
  env: { ...process.env, PORT: PORT },
  stdio: ["ignore", "pipe", "pipe"]
});

let serverOutput = "";
serverProcess.stdout.on("data", data => {
  serverOutput += data.toString();
});
serverProcess.stderr.on("data", data => {
  console.error("Server stderr:", data.toString());
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeRequest(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${PORT}${urlPath}`, (res) => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on("error", reject);
  });
}

async function runTests() {
  // wait for server to start
  await sleep(1500);

  let failed = 0;
  let passed = 0;

  async function testRoute(name, path, validate) {
    try {
      console.log(`\nTesting: [${name}] -> ${path}`);
      const res = await makeRequest(path);
      validate(res);
      console.log(`  PASSED: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  FAILED: ${name}`);
      console.error(`  Reason: ${err.message}`);
      failed++;
    }
  }

  // Test 1: Home page
  await testRoute("Home page renders successfully", "/", (res) => {
    if (res.statusCode !== 200) throw new Error(`Expected 200 but got ${res.statusCode}`);
    if (!res.body.includes("Cocktail Companion")) throw new Error("Body missing title");
    if (!res.body.includes("Browse by Category")) throw new Error("Body missing category section");
  });

  // Test 2: Search for known cocktail
  await testRoute("Search for 'margarita'", "/search?q=margarita", (res) => {
    if (res.statusCode !== 200) throw new Error(`Expected 200 but got ${res.statusCode}`);
    if (!res.body.includes("Found") && !res.body.includes("Margarita")) {
      throw new Error("Results missing Margarita");
    }
  });

  // Test 3: Search with no results handled gracefully
  await testRoute("Search with unknown cocktail term", "/search?q=xyznonexistentcocktail123", (res) => {
    if (res.statusCode !== 200) throw new Error(`Expected 200 but got ${res.statusCode}`);
    if (!res.body.includes("No cocktails found")) throw new Error("Did not show friendly 'No cocktails found' message");
  });

  // Test 4: Random drink redirect
  await testRoute("Random drink redirects to /drink/:id", "/random", (res) => {
    if (res.statusCode !== 302) throw new Error(`Expected 302 redirect but got ${res.statusCode}`);
    if (!res.headers.location || !res.headers.location.startsWith("/drink/")) {
      throw new Error(`Expected redirect to /drink/:id but got ${res.headers.location}`);
    }
  });

  // Test 5: Single cocktail recipe detail (Margarita ID 11007)
  await testRoute("Recipe details page with food pairing & joke", "/drink/11007", (res) => {
    if (res.statusCode !== 200) throw new Error(`Expected 200 but got ${res.statusCode}`);
    if (!res.body.includes("Margarita")) throw new Error("Recipe missing drink title");
    if (!res.body.includes("Tequila")) throw new Error("Recipe missing Tequila ingredient");
    if (!res.body.includes("Instructions")) throw new Error("Recipe missing instructions");
    if (!res.body.includes("Chef's Food Pairing")) throw new Error("Missing 2nd API Food Pairing");
  });

  // Test 6: Bonus 1: Category filter route
  await testRoute("Category filter for 'Shot'", "/category/Shot", (res) => {
    if (res.statusCode !== 200) throw new Error(`Expected 200 but got ${res.statusCode}`);
    if (!res.body.includes("Shot")) throw new Error("Missing Shot category title");
    if (!res.body.includes("View Recipe")) throw new Error("Missing drink list cards");
  });

  // Test 7: 404 handler
  await testRoute("Catch-all 404 handler", "/some-invalid-page-xyz", (res) => {
    if (res.statusCode !== 404) throw new Error(`Expected 404 but got ${res.statusCode}`);
    if (!res.body.includes("404")) throw new Error("Body missing 404 message");
  });

  // Clean up
  serverProcess.kill();

  console.log(`\n================================`);
  console.log(`Tests finished: ${passed} passed, ${failed} failed`);
  console.log(`================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
