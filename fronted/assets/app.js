const API_BASE = "https://bio-nsb9.onrender.com"; // ← podmień na swój backend po deployu

async function loadProfile() {
  try {
    const res = await fetch(`${API_BASE}/api/profile`);
    const data = await res.json();
    document.getElementById("name").textContent = data.name || "Brak danych";
    document.getElementById("bio").textContent = data.bio || "";
    document.getElementById("avatar").src = data.avatar_url || "https://placehold.co/120x120";
  } catch (err) {
    console.error("Błąd ładowania profilu:", err);
  }
}

async function loadSocials() {
  try {
    const res = await fetch(`${API_BASE}/api/socials`);
    const socials = await res.json();
    const container = document.getElementById("social-links");
    container.innerHTML = socials
      .map(s => `<a href="${s.url}" target="_blank" rel="noopener">${s.platform}</a>`)
      .join("");
  } catch (err) {
    console.error("Błąd ładowania linków:", err);
  }
}

document.getElementById("year").textContent = new Date().getFullYear();

// Start
loadProfile();
loadSocials();
