const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// public API base URLs
const COCKTAIL_API_BASE = "https://www.thecocktaildb.com/api/json/v1/1";
const MEAL_API_BASE = "https://www.themealdb.com/api/json/v1/1";
const JOKE_API_BASE = "https://v2.jokeapi.dev/joke";

// default categories list fallback
const DEFAULT_CATEGORIES = [
  "Cocktail",
  "Ordinary Drink",
  "Shot",
  "Punch / Party Drink",
  "Coffee / Tea",
  "Beer",
  "Soft Drink",
  "Shake",
  "Homemade Liqueur",
  "Cocoa",
  "Other / Unknown"
];

// middleware setup
const viewsPath = fs.existsSync(path.join(__dirname, "views")) ? path.join(__dirname, "views") : __dirname;
const staticPath = fs.existsSync(path.join(__dirname, "public")) ? path.join(__dirname, "public") : __dirname;

app.use(express.static(staticPath));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", viewsPath);

// helper function: format raw CocktailDB drink object
function formatDrink(rawDrink) {
  if (!rawDrink) return null;

  // extract ingredients and measures into paired list
  const ingredients = [];
  for (let i = 1; i <= 15; i++) {
    const ingredient = rawDrink[`strIngredient${i}`];
    const measure = rawDrink[`strMeasure${i}`];

    if (ingredient && ingredient.trim() !== "") {
      ingredients.push({
        name: ingredient.trim(),
        measure: measure && measure.trim() !== "" ? measure.trim() : "To taste"
      });
    }
  }

  return {
    id: rawDrink.idDrink,
    name: rawDrink.strDrink,
    category: rawDrink.strCategory || "Uncategorized",
    alcoholic: rawDrink.strAlcoholic || "Alcoholic",
    glass: rawDrink.strGlass || "Cocktail glass",
    instructions: rawDrink.strInstructions || "No instructions provided.",
    thumbnail: rawDrink.strDrinkThumb || "https://via.placeholder.com/400x400?text=No+Image",
    ingredients: ingredients
  };
}

// helper function: fetch available categories from CocktailDB API
async function fetchCategories() {
  try {
    const response = await axios.get(`${COCKTAIL_API_BASE}/list.php?c=list`, { timeout: 4000 });
    if (response.data && response.data.drinks) {
      return response.data.drinks.map(d => d.strCategory).filter(Boolean);
    }
  } catch (err) {
    console.warn("Could not load remote categories list, using fallback defaults:", err.message);
  }
  return DEFAULT_CATEGORIES;
}

// helper function: fetch food pairing from TheMealDB API (Bonus API 2)
async function fetchFoodPairing() {
  try {
    const response = await axios.get(`${MEAL_API_BASE}/random.php`, { timeout: 4000 });
    if (response.data && response.data.meals && response.data.meals.length > 0) {
      const meal = response.data.meals[0];
      return {
        id: meal.idMeal,
        name: meal.strMeal,
        category: meal.strCategory,
        area: meal.strArea,
        thumbnail: meal.strMealThumb,
        instructions: meal.strInstructions
      };
    }
  } catch (err) {
    console.warn("Could not fetch food pairing from TheMealDB API:", err.message);
  }
  return null;
}

// helper function: fetch joke from JokeAPI (Bonus API 2)
async function fetchJoke() {
  try {
    const response = await axios.get(
      `${JOKE_API_BASE}/Programming,Pun?blacklistFlags=nsfw,religious,political,racist,sexist,explicit`,
      { timeout: 4000 }
    );
    if (response.data && !response.data.error) {
      if (response.data.type === "twopart") {
        return {
          type: "twopart",
          setup: response.data.setup,
          delivery: response.data.delivery
        };
      } else {
        return {
          type: "single",
          joke: response.data.joke
        };
      }
    }
  } catch (err) {
    console.warn("Could not fetch joke from JokeAPI:", err.message);
  }
  return null;
}

// home page route
app.get("/", async (req, res) => {
  try {
    const categories = await fetchCategories();

    // fetch a featured cocktail for the hero display
    let featuredDrink = null;
    try {
      const featuredResponse = await axios.get(`${COCKTAIL_API_BASE}/random.php`, { timeout: 4000 });
      if (featuredResponse.data && featuredResponse.data.drinks) {
        featuredDrink = formatDrink(featuredResponse.data.drinks[0]);
      }
    } catch (featuredErr) {
      console.warn("Could not fetch featured cocktail:", featuredErr.message);
    }

    // fetch a fun bartender joke
    const joke = await fetchJoke();

    res.render("index", {
      categories: categories,
      featuredDrink: featuredDrink,
      joke: joke,
      error: null,
      searchQuery: null
    });
  } catch (err) {
    console.error("Error loading home page:", err.message);
    res.status(500).render("error", {
      errorMessage: "Could not load the home page. Please verify your internet connection and try again.",
      backLink: "/"
    });
  }
});

// search cocktails route (GET)
app.get("/search", async (req, res) => {
  const query = (req.query.q || "").trim();
  const categories = await fetchCategories();

  if (!query) {
    return res.render("index", {
      categories: categories,
      featuredDrink: null,
      joke: null,
      error: "Please enter a cocktail name to search (e.g. Margarita, Mojito, Martini).",
      searchQuery: ""
    });
  }

  try {
    const response = await axios.get(`${COCKTAIL_API_BASE}/search.php?s=${encodeURIComponent(query)}`, { timeout: 5000 });
    const rawDrinks = response.data.drinks;

    if (!rawDrinks || rawDrinks.length === 0) {
      return res.render("index", {
        categories: categories,
        featuredDrink: null,
        joke: null,
        error: `No cocktails found matching "${query}". Check your spelling or try searching for a different drink!`,
        searchQuery: query
      });
    }

    const drinks = rawDrinks.map(formatDrink);
    res.render("search-results", {
      drinks: drinks,
      searchQuery: query,
      categories: categories
    });
  } catch (err) {
    console.error(`Error searching cocktails for "${query}":`, err.message);
    res.render("index", {
      categories: categories,
      featuredDrink: null,
      joke: null,
      error: `Network error while contacting CocktailDB API: ${err.message}. Please try again.`,
      searchQuery: query
    });
  }
});

// search cocktails route (POST support)
app.post("/search", (req, res) => {
  const query = (req.body.q || "").trim();
  res.redirect(`/search?q=${encodeURIComponent(query)}`);
});

// random cocktail route
app.get("/random", async (req, res) => {
  try {
    const response = await axios.get(`${COCKTAIL_API_BASE}/random.php`, { timeout: 5000 });
    if (response.data && response.data.drinks && response.data.drinks.length > 0) {
      const drinkId = response.data.drinks[0].idDrink;
      return res.redirect(`/drink/${drinkId}`);
    }
    throw new Error("No random drink returned by CocktailDB API");
  } catch (err) {
    console.error("Error fetching random cocktail:", err.message);
    res.status(500).render("error", {
      errorMessage: `Failed to fetch a random cocktail: ${err.message}`,
      backLink: "/"
    });
  }
});

// single cocktail recipe detail route (with Bonus 2: Food Pairing & Joke API)
app.get("/drink/:id", async (req, res) => {
  const drinkId = req.params.id;

  try {
    // 1. Fetch cocktail details from CocktailDB
    const drinkPromise = axios.get(`${COCKTAIL_API_BASE}/lookup.php?i=${encodeURIComponent(drinkId)}`, { timeout: 5000 });

    // 2. Bonus API 2: Fetch food pairing from TheMealDB
    const mealPromise = fetchFoodPairing();

    // 3. Bonus API 2: Fetch bartender joke from JokeAPI
    const jokePromise = fetchJoke();

    const [drinkRes, foodPairing, joke] = await Promise.all([drinkPromise, mealPromise, jokePromise]);

    if (!drinkRes.data || !drinkRes.data.drinks || drinkRes.data.drinks.length === 0) {
      return res.status(404).render("error", {
        errorMessage: `Cocktail with ID "${drinkId}" was not found.`,
        backLink: "/"
      });
    }

    const drink = formatDrink(drinkRes.data.drinks[0]);

    res.render("recipe", {
      drink: drink,
      foodPairing: foodPairing,
      joke: joke
    });
  } catch (err) {
    console.error(`Error fetching cocktail ID "${drinkId}":`, err.message);
    res.status(500).render("error", {
      errorMessage: `Could not retrieve cocktail details: ${err.message}`,
      backLink: "/"
    });
  }
});

// category filter handler (from form submission)
app.get("/category", (req, res) => {
  const category = (req.query.category || "").trim();
  if (!category) {
    return res.redirect("/");
  }
  res.redirect(`/category/${encodeURIComponent(category)}`);
});

// category browse route (Bonus Challenge 1)
app.get("/category/:category", async (req, res) => {
  const categoryName = req.params.category;
  const categories = await fetchCategories();

  try {
    const response = await axios.get(
      `${COCKTAIL_API_BASE}/filter.php?c=${encodeURIComponent(categoryName)}`,
      { timeout: 5000 }
    );

    const rawDrinks = response.data.drinks;

    if (!rawDrinks || rawDrinks.length === 0) {
      return res.render("category", {
        category: categoryName,
        drinks: [],
        categories: categories,
        error: `No drinks found under the category "${categoryName}".`
      });
    }

    const drinks = rawDrinks.map(d => ({
      id: d.idDrink,
      name: d.strDrink,
      thumbnail: d.strDrinkThumb || "https://via.placeholder.com/300x300?text=No+Image"
    }));

    res.render("category", {
      category: categoryName,
      drinks: drinks,
      categories: categories,
      error: null
    });
  } catch (err) {
    console.error(`Error filtering by category "${categoryName}":`, err.message);
    res.status(500).render("error", {
      errorMessage: `Failed to load drinks for category "${categoryName}": ${err.message}`,
      backLink: "/"
    });
  }
});

// catch-all 404 handler
app.use((req, res) => {
  res.status(404).render("error", {
    errorMessage: "404 - The page you are looking for does not exist on this server.",
    backLink: "/"
  });
});

// start server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  🍸 Cocktail Companion server is running!`);
  console.log(`  Visit: http://localhost:${PORT}`);
  console.log(`  Press Ctrl + C to stop`);
  console.log(`=========================================`);
});
