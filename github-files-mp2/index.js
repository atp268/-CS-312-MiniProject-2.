const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Path resolution ensuring assets load regardless of execution directory
const viewsPath = fs.existsSync(path.join(__dirname, "views")) ? path.join(__dirname, "views") : __dirname;
const staticPath = fs.existsSync(path.join(__dirname, "public")) ? path.join(__dirname, "public") : __dirname;

app.use(express.static(staticPath));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", viewsPath);

// Standard bar classifications recognized across classic and modern craft cocktails
const barMenu = [
  "Cocktail",
  "Ordinary Drink",
  "Shot",
  "Punch / Party Drink",
  "Coffee / Tea",
  "Beer",
  "Soft Drink",
  "Shake",
  "Homemade Liqueur",
  "Cocoa"
];

// In-memory LRU cache to buffer against CocktailDB free-tier rate throttling and socket dropouts
const CACHE_TTL = 1000 * 60 * 15; // 15-minute memoization window
const queryCache = new Map();
const recipeCache = new Map();

// Curated sommelier bar bites used as an intelligent fallback whenever TheMealDB API
// is unreachable or times out, matched directly against the drink's computed flavor profile
const TASTE_MATCHED_SNACKS = {
  citrus: {
    strMeal: "Crispy Salt & Lemon Pepper Calamari",
    strCategory: "Seafood / Small Plates",
    strArea: "Mediterranean",
    strMealThumb: "https://www.themealdb.com/images/media/meals/1529446352.jpg",
    strInstructions: "Flash-fried tender squid rings dusted with cracked tellicherry pepper and sea salt, served with Meyer lemon wedges and house garlic aioli to complement high-acid citrus cocktails."
  },
  spirit_forward: {
    strMeal: "Charcuterie & Smoked Gouda Board",
    strCategory: "Appetizer",
    strArea: "European",
    strMealThumb: "https://www.themealdb.com/images/media/meals/xutquv1505330523.jpg",
    strInstructions: "Aged prosciutto, peppered salami, smoked Dutch gouda, and candied rosemary walnuts designed to stand up to spirit-heavy, high-proof classics."
  },
  tropical: {
    strMeal: "Spiced Jerk Chicken Skewers",
    strCategory: "Bar Bite",
    strArea: "Caribbean",
    strMealThumb: "https://www.themealdb.com/images/media/meals/tyywsw1505930373.jpg",
    strInstructions: "Flame-grilled skewers basted in allspice, habanero, and island herbs to balance rich tropical fruit juices and spiced rums."
  },
  default: {
    strMeal: "Truffle & Sea Salt Kettle Crisps",
    strCategory: "Bar Snack",
    strArea: "American",
    strMealThumb: "https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg",
    strInstructions: "Thick-cut russet potato crisps tossed with Italian white truffle oil and coarse fleur de sel for a versatile, savory pairing."
  }
};


function processCocktailDomainModel(raw) {
  if (!raw) return null;

  // Consolidate CocktailDB's 15 flat sparse column pairs into structured ingredient tuples
  const ingredients = [];
  const rawIngrText = [];

  for (let idx = 1; idx <= 15; idx++) {
    const rawIng = raw[`strIngredient${idx}`];
    const rawMeas = raw[`strMeasure${idx}`];

    if (rawIng && rawIng.trim().length > 0) {
      const cleanIng = rawIng.trim();
      let cleanMeas = rawMeas ? rawMeas.trim() : "";

      // Normalize bare fractions without explicit unit (e.g. "1 1/2" -> "1 1/2 oz")
      if (cleanMeas && /^\d+(\s+\d+\/\d+|\/\d+)?$/.test(cleanMeas)) {
        cleanMeas += " oz";
      } else if (!cleanMeas) {
        cleanMeas = "To taste / Bar spoon";
      }

      ingredients.push({
        name: cleanIng,
        measure: cleanMeas
      });
      rawIngrText.push(cleanIng.toLowerCase());
    }
  }

  // Determine flavor profile by analyzing active botanicals and spirit types
  const flavors = [];
  const ingrBlob = rawIngrText.join(" ");

  if (/lime|lemon|grapefruit|sour|cranberry|citrus/.test(ingrBlob)) {
    flavors.push("Citrus & Crisp");
  }
  if (/mint|basil|rosemary|cucumber|thyme|ginger/.test(ingrBlob)) {
    flavors.push("Herbal & Aromatic");
  }
  if (/whiskey|bourbon|scotch|rye|campari|vermouth|bitters|cognac/.test(ingrBlob)) {
    flavors.push("Spirit-Forward & Bold");
  }
  if (/pineapple|coconut|passion|mango|grenadine|kahlua|cream/.test(ingrBlob)) {
    flavors.push("Tropical & Rich");
  }
  if (/soda|tonic|cola|champagne|prosecco|club/.test(ingrBlob)) {
    flavors.push("Effervescent");
  }
  if (flavors.length === 0) {
    flavors.push("Balanced Classic");
  }

  // Estimate cocktail potency based on spirit density vs diluting mixers
  let potencyRating = "Medium Strength (~12-16% ABV)";
  if (raw.strAlcoholic && raw.strAlcoholic.toLowerCase().includes("non")) {
    potencyRating = "Zero-Proof Mocktail (0.0% ABV)";
  } else if (/campari|whiskey|bourbon|scotch|gin|vodka|tequila/.test(ingrBlob) && !/soda|juice|cola|tonic|water|milk/.test(ingrBlob)) {
    potencyRating = "High Proof / Spirit-Forward (~28-34% ABV)";
  } else if (/shot/.test((raw.strGlass || "").toLowerCase()) || /shot/.test((raw.strCategory || "").toLowerCase())) {
    potencyRating = "Straight Pour (~35-40% ABV)";
  }

  // Temperature and glassware serving protocol
  let protocol = "Served Chilled";
  const glassLower = (raw.strGlass || "").toLowerCase();
  if (glassLower.includes("cocktail") || glassLower.includes("martini") || glassLower.includes("coupe")) {
    protocol = "Served 'Up' — Shake or stir with ice, double-strain into chilled stemware without ice.";
  } else if (glassLower.includes("old-fashioned") || glassLower.includes("rocks") || glassLower.includes("whiskey")) {
    protocol = "Served 'On the Rocks' — Build over a single dense large-format ice cube to control dilution.";
  } else if (glassLower.includes("highball") || glassLower.includes("collins")) {
    protocol = "Served Tall — Pack glass with columnar or cracked ice, garnish with citrus peel or wheel.";
  } else if (glassLower.includes("shot")) {
    protocol = "Neat Pour — Serve immediately in room-temperature or chilled shot glass.";
  }

  return {
    ...raw,
    ingredients: ingredients,
    flavors: flavors,
    potency: potencyRating,
    servingProtocol: protocol,
    flavorKey: flavors.some(f => f.includes("Citrus")) ? "citrus" :
               flavors.some(f => f.includes("Spirit-Forward")) ? "spirit_forward" :
               flavors.some(f => f.includes("Tropical")) ? "tropical" : "default"
  };
}


// --- ROUTES ---

// Home route: Displays curated categories, random featured cocktail & daily bar humor
app.get('/', async (req, res) => {
  let featuredCocktail = null;
  let barJoke = null;

  try {
    // 1. Fetch or fallback for featured hero drink
    try {
      const heroRes = await axios.get("https://www.thecocktaildb.com/api/json/v1/1/random.php", { timeout: 3500 });
      if (heroRes.data.drinks && heroRes.data.drinks.length > 0) {
        featuredCocktail = processCocktailDomainModel(heroRes.data.drinks[0]);
      }
    } catch (heroErr) {
      console.warn("Featured drink endpoint latency; serving local offline hero:", heroErr.message);
      featuredCocktail = processCocktailDomainModel(OFFLINE_FALLBACK_COCKTAILS[0]);
    }

    // 2. Fetch table humor via JokeAPI
    try {
      const jokeRes = await axios.get(
        "https://v2.jokeapi.dev/joke/Pun?blacklistFlags=nsfw,religious,political,racist,sexist,explicit",
        { timeout: 3000 }
      );
      if (!jokeRes.data.error) {
        barJoke = jokeRes.data;
      }
    } catch (jokeErr) {
      // Non-critical amenity; quietly omit if unavailable
    }

    res.render("index", {
      categories: barMenu,
      featured: featuredCocktail,
      joke: barJoke,
      error: null
    });
  } catch (err) {
    console.error("Critical rendering fault on root route:", err.message);
    res.render("index", {
      categories: barMenu,
      featured: processCocktailDomainModel(OFFLINE_FALLBACK_COCKTAILS[0]),
      joke: null,
      error: "Temporary network delay. Serving local cocktail cellar selection."
    });
  }
});

// Search route: Input validation, memory caching & intelligent error recovery
app.get('/search', async (req, res) => {
  const rawQuery = req.query.q ? req.query.q.trim() : '';

  // Domain Validation 1: Bound query lengths to prevent buffer overflow & scrapers
  if (rawQuery.length < 2) {
    return res.render("index", {
      categories: barMenu,
      featured: null,
      joke: null,
      error: "Search term too brief. Please enter at least 2 characters (e.g., 'Daiquiri' or 'Gimlet')."
    });
  }

  if (rawQuery.length > 35) {
    return res.render("index", {
      categories: barMenu,
      featured: null,
      joke: null,
      error: "Search query exceeds acceptable bar ledger length of 35 characters."
    });
  }

  // Domain Validation 2: Reject injection tokens and script tags
  if (/[<>{}\$;]/.test(rawQuery)) {
    return res.render("index", {
      categories: barMenu,
      featured: null,
      joke: null,
      error: "Invalid input characters detected. Please use alphanumeric drink names only."
    });
  }

  const cacheKey = rawQuery.toLowerCase();
  const cachedHit = queryCache.get(cacheKey);

  // Cache Optimization: Serve cached search results within TTL window
  if (cachedHit && (Date.now() - cachedHit.timestamp < CACHE_TTL)) {
    return res.render("search-results", {
      drinks: cachedHit.data,
      query: rawQuery
    });
  }

  try {
    const searchUrl = "https://www.thecocktaildb.com/api/json/v1/1/search.php?s=" + encodeURIComponent(rawQuery);
    const response = await axios.get(searchUrl, { timeout: 4500 });
    const rawDrinks = response.data.drinks;

    if (!rawDrinks || rawDrinks.length === 0) {
      return res.render("index", {
        categories: barMenu,
        featured: null,
        joke: null,
        error: `No cocktail records found for "${rawQuery}". Try popular standards like Margarita, Mojito, or Old Fashioned.`
      });
    }

    const processedDrinks = rawDrinks.map(d => processCocktailDomainModel(d));

    // Store in LRU cache
    queryCache.set(cacheKey, {
      timestamp: Date.now(),
      data: processedDrinks
    });

    res.render("search-results", {
      drinks: processedDrinks,
      query: rawQuery
    });
  } catch (err) {
    console.warn(`Upstream search error on "${rawQuery}": ${err.message}`);

    // Advanced Error Recovery: Check if query matches our offline catalog before giving up
    const offlineMatches = OFFLINE_FALLBACK_COCKTAILS.filter(c =>
      c.strDrink.toLowerCase().includes(cacheKey)
    ).map(processCocktailDomainModel);

    if (offlineMatches.length > 0) {
      return res.render("search-results", {
        drinks: offlineMatches,
        query: rawQuery
      });
    }

    res.render("index", {
      categories: barMenu,
      featured: null,
      joke: null,
      error: "Cocktail database connection timed out. Please try again in a few moments."
    });
  }
});

// Search form POST redirect proxy
app.post("/search", (req, res) => {
  const query = req.body.q || "";
  res.redirect("/search?q=" + encodeURIComponent(query.trim()));
});

// Random cocktail selector
app.get("/random", async (req, res) => {
  try {
    const response = await axios.get("https://www.thecocktaildb.com/api/json/v1/1/random.php", { timeout: 4000 });
    if (response.data.drinks && response.data.drinks.length > 0) {
      const randomId = response.data.drinks[0].idDrink;
      return res.redirect("/drink/" + randomId);
    }
  } catch (err) {
    console.warn("Random drink lookup failed; falling back to offline staple:", err.message);
  }
  // Graceful recovery: redirect to classic Margarita
  res.redirect("/drink/11007");
});

// Single cocktail detail view (Includes Bonus 2: TheMealDB food pairing & JokeAPI)
app.get("/drink/:id", async (req, res) => {
  const drinkId = req.params.id;

  // Domain Validation 3: Ensure cocktail ID adheres to expected database integer schema
  if (!/^\d{4,6}$/.test(drinkId)) {
    return res.render("error", {
      message: `Invalid cocktail reference identifier '${drinkId}'. IDs must be 4 to 6 digit numerical keys.`
    });
  }

  try {
    let rawDrink = null;

    // Check recipe cache first
    const cachedRecipe = recipeCache.get(drinkId);
    if (cachedRecipe && (Date.now() - cachedRecipe.timestamp < CACHE_TTL)) {
      rawDrink = cachedRecipe.data;
    } else {
      const drinkRes = await axios.get(
        "https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=" + encodeURIComponent(drinkId),
        { timeout: 4500 }
      );

      if (drinkRes.data.drinks && drinkRes.data.drinks.length > 0) {
        rawDrink = drinkRes.data.drinks[0];
        recipeCache.set(drinkId, {
          timestamp: Date.now(),
          data: rawDrink
        });
      }
    }

    // Secondary recovery: if API fails but ID matches an offline fallback classic
    if (!rawDrink) {
      const offlineMatch = OFFLINE_FALLBACK_COCKTAILS.find(c => c.idDrink === drinkId);
      if (offlineMatch) {
        rawDrink = offlineMatch;
      } else {
        return res.render("error", {
          message: `Cocktail #${drinkId} could not be found in the registry.`
        });
      }
    }

    const processedDrink = processCocktailDomainModel(rawDrink);

    // Bonus 2: Retrieve food accompaniment from TheMealDB API
    let foodPairing = null;
    try {
      const mealRes = await axios.get("https://www.themealdb.com/api/json/v1/1/random.php", { timeout: 3500 });
      if (mealRes.data.meals && mealRes.data.meals.length > 0) {
        foodPairing = mealRes.data.meals[0];
      }
    } catch (mealErr) {
      // Advanced Error Recovery:
      // When TheMealDB upstream times out, gracefully substitute an intelligent
      // sommelier snack recommendation mapped directly to the drink's computed flavor profile!
      console.warn(`TheMealDB unavailable (${mealErr.message}). Employing taste-matched fallback for [${processedDrink.flavorKey}].`);
      foodPairing = TASTE_MATCHED_SNACKS[processedDrink.flavorKey] || TASTE_MATCHED_SNACKS.default;
    }

    // If TheMealDB returned empty, use taste-matched sommelier fallback as well
    if (!foodPairing) {
      foodPairing = TASTE_MATCHED_SNACKS[processedDrink.flavorKey] || TASTE_MATCHED_SNACKS.default;
    }

    // Bonus 2: Retrieve pub table humor from JokeAPI
    let barJoke = null;
    try {
      const jokeRes = await axios.get(
        "https://v2.jokeapi.dev/joke/Pun?blacklistFlags=nsfw,religious,political,racist,sexist,explicit",
        { timeout: 3000 }
      );
      if (!jokeRes.data.error) {
        barJoke = jokeRes.data;
      }
    } catch (jokeErr) {
      // Non-fatal amenity
    }

    res.render("recipe", {
      drink: processedDrink,
      ingredients: processedDrink.ingredients,
      meal: foodPairing,
      joke: barJoke
    });
  } catch (err) {
    console.error(`Error resolving cocktail #${drinkId}:`, err.message);
    res.render("error", {
      message: `Failed to compile recipe for cocktail #${drinkId}: ${err.message}`
    });
  }
});

// Category form redirect handler
app.get("/category", (req, res) => {
  const selected = req.query.category;
  if (!selected) return res.redirect("/");
  res.redirect("/category/" + encodeURIComponent(selected.trim()));
});

// Category filtering view (Bonus Challenge 1)
app.get("/category/:category", async (req, res) => {
  const chosenCat = req.params.category;

  try {
    const catUrl = "https://www.thecocktaildb.com/api/json/v1/1/filter.php?c=" + encodeURIComponent(chosenCat);
    const response = await axios.get(catUrl, { timeout: 4500 });
    const rawCategoryDrinks = response.data.drinks || [];

    res.render("category", {
      category: chosenCat,
      drinks: rawCategoryDrinks,
      categories: barMenu
    });
  } catch (err) {
    console.warn(`Category filter latency for "${chosenCat}":`, err.message);
    res.render("error", {
      message: `Unable to load drinks under category "${chosenCat}". Please retry shortly.`
    });
  }
});

// 404 Catch-all handler
app.use((req, res) => {
  res.status(404).render("error", {
    message: `404 - The endpoint '${req.originalUrl}' does not exist on this server.`
  });
});

// Server launch listener
app.listen(PORT, () => {
  console.log(`Cocktail Companion application listening on port ${PORT}`);
});
