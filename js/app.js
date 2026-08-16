/* =====================================================
   SUPABASE CONFIG
===================================================== */

const SUPABASE_URL = "https://omvmjspbrugjjlerrkrf.supabase.co";
const SUPABASE_KEY = "sb_publishable_2cz1Ovi8mEhXTft6UfHXoQ_uXSF8bn4";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const IMAGE_BUCKET = "product-images";
const SELECTED_PROFILE_KEY = "familyRewardsSelectedProfile";

let rewards = [];
let profiles = [];
let activeCategory = "All";
let selectedReward = null;
let editingReward = null;
let pendingPhotoFile = null;
let photoRemoved = false;
let balance = 0;
let redemptionHistory = [];
let dataLoaded = false;
let currentProfile = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getImageUrl(image) {
  if (!image) return null;
  if (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("data:")) return image;
  return supabaseClient.storage.from(IMAGE_BUCKET).getPublicUrl(image).data?.publicUrl || null;
}

function getProfileName(profile) {
  return profile?.name || "Family Member";
}

function chefAvatarSvg() {
  return `<svg viewBox="0 0 64 64" width="100%" height="100%" aria-label="Chef avatar" role="img"><circle cx="32" cy="32" r="32" fill="#fff4e6"/><path d="M18 25c-3-8 3-13 9-10 1-6 11-6 12 0 7-3 12 4 8 10" fill="#fff" stroke="#d9d0c7" stroke-width="2"/><path d="M19 24h26v9H19z" fill="#fff" stroke="#d9d0c7" stroke-width="2"/><circle cx="26" cy="40" r="9" fill="#f6c7a7"/><circle cx="38" cy="40" r="9" fill="#f6c7a7"/><path d="M22 36c2-8 18-8 20 0v11H22z" fill="#7a4b35"/><path d="M27 40h1M36 40h1" stroke="#4b342b" stroke-width="2.5" stroke-linecap="round"/><path d="M29 46c2 2 4 2 6 0" fill="none" stroke="#9b594d" stroke-width="1.8" stroke-linecap="round"/><path d="M19 52c5-5 21-5 26 0v6H19z" fill="#fff"/><path d="M25 52l7 5 7-5" fill="none" stroke="#d9d0c7" stroke-width="2"/></svg>`;
}

function getAvatar(name) {
  const value = String(name || "").trim().toLowerCase();
  if (value === "饲养员") return "🌙";
  if (value === "老猪" || value === "old zhu") return "🐷";
  if (value === "狗屎" || value === "shit") return "💩";
  if (value === "大厨" || value === "chef") return chefAvatarSvg();
  return "👤";
}

function isParent() {
  return String(currentProfile?.role || "").toLowerCase() === "parent";
}

/* =====================================================
   ACCOUNT SWITCHER
===================================================== */

async function loadProfiles() {
  const result = await supabaseClient
    .from("profiles")
    .select("id,name,balance,role")
    .order("id", { ascending: true });

  if (result.error) {
    console.error("Profiles load error:", result.error);
    showToast("Unable to load family accounts.");
    return false;
  }

  profiles = result.data || [];

  if (profiles.length === 0) {
    showToast("No family accounts found.");
    return false;
  }

  const savedId = Number(localStorage.getItem(SELECTED_PROFILE_KEY));
  const savedProfile = profiles.find(profile => profile.id === savedId);
  currentProfile = savedProfile || profiles[0];
  localStorage.setItem(SELECTED_PROFILE_KEY, String(currentProfile.id));

  return true;
}

function renderAccountMenu() {
  const list = document.getElementById("accountList");
  if (!list) return;

  list.innerHTML = profiles.map(profile => {
    const active = currentProfile && profile.id === currentProfile.id;
    const role = profile.role === "parent" ? "Parent" : "Child";
    const avatar = getAvatar(profile.name);

    return `
      <button class="account-option ${active ? "active" : ""}" onclick="switchProfile(${profile.id})">
        <span class="account-option-avatar">${avatar}</span>
        <span class="account-option-info">
          <strong>${escapeHtml(getProfileName(profile))}</strong>
          <small>${role} · ${Number(profile.balance || 0).toLocaleString()} pts</small>
        </span>
        ${active ? "<span>✓</span>" : ""}
      </button>
    `;
  }).join("");
}

function toggleAccountMenu() {
  const menu = document.getElementById("accountMenu");
  const button = document.getElementById("accountSwitcher");
  if (!menu) return;

  const open = menu.style.display !== "none";
  menu.style.display = open ? "none" : "block";
  if (button) button.setAttribute("aria-expanded", String(!open));
  if (!open) renderAccountMenu();
}

function closeAccountMenu() {
  const menu = document.getElementById("accountMenu");
  const button = document.getElementById("accountSwitcher");
  if (menu) menu.style.display = "none";
  if (button) button.setAttribute("aria-expanded", "false");
}

async function switchProfile(id) {
  const profile = profiles.find(item => item.id === Number(id));
  if (!profile) return;

  currentProfile = profile;
  localStorage.setItem(SELECTED_PROFILE_KEY, String(profile.id));
  closeAccountMenu();
  await loadCloudData();
  updateUserHeader();
  renderProducts();
  renderAccountMenu();
}

document.addEventListener("click", event => {
  const account = document.querySelector(".account");
  if (account && !account.contains(event.target)) closeAccountMenu();
});

function updateUserHeader() {
  const name = getProfileName(currentProfile);
  const nameElement = document.getElementById("userName");
  const avatarElement = document.getElementById("userAvatar");

  if (nameElement) nameElement.textContent = name;
  if (avatarElement) {
    const avatar = getAvatar(name);
    avatarElement.innerHTML = avatar.startsWith("<svg") ? avatar : escapeHtml(avatar);
  }
  updateBalanceDisplay();
}

/* =====================================================
   CLOUD DATA
===================================================== */

async function loadCloudData() {
  if (!currentProfile) return false;

  const profileResult = await supabaseClient
    .from("profiles")
    .select("id,name,balance,role")
    .eq("id", currentProfile.id)
    .single();

  if (profileResult.error) {
    console.error("Profile load error:", profileResult.error);
    showToast("Unable to load this family's points.");
    return false;
  }

  currentProfile = profileResult.data;
  balance = Number(currentProfile.balance || 0);

  const historyResult = await supabaseClient
    .from("redemptions")
    .select("id,user_id,reward_id,reward_name,cost,created_at")
    .eq("user_id", currentProfile.id)
    .order("created_at", { ascending: false });

  if (historyResult.error) {
    console.error("Redemption history load error:", historyResult.error);
    showToast("Unable to load redemption history.");
    return false;
  }

  redemptionHistory = historyResult.data || [];
  dataLoaded = true;
  updateUserHeader();
  return true;
}

async function loadRewards() {
  const result = await supabaseClient
    .from("rewards")
    .select("id,name,cost,category,image,icon")
    .order("id", { ascending: true });

  if (result.error) {
    console.error("Rewards load error:", result.error);
    const grid = document.getElementById("productGrid");
    if (grid) grid.innerHTML = "<p style='padding:40px'>Unable to load rewards. Check the browser Console.</p>";
    return;
  }

  rewards = result.data || [];
  renderFilters();
  renderProducts();
}

/* =====================================================
   FILTERS + PRODUCTS
===================================================== */

function renderFilters() {
  const container = document.getElementById("filters");
  if (!container) return;

  const categories = ["All", ...new Set(rewards.map(reward => reward.category).filter(Boolean))];
