import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client (service role key – tylko po stronie serwera!)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ========================== ROUTES =============================

// GET /api/profile
app.get("/api/profile", async (req, res) => {
  const { data, error } = await supabase.from("profile").select("*").single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/socials
app.get("/api/socials", async (req, res) => {
  const { data, error } = await supabase.from("socials").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/projects
app.get("/api/projects", async (req, res) => {
  const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/messages
app.post("/api/messages", async (req, res) => {
  const { email, message } = req.body;
  const { error } = await supabase.from("messages").insert([{ email, message }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get("/", (req, res) => {
  res.send("API działa poprawnie 🚀");
});

// ================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Backend działa na porcie ${PORT}`));
