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

  container.innerHTML = categories.map(category => `
    <button class="filter ${category === activeCategory ? "active" : ""}" onclick="setCategory('${escapeHtml(category)}')">
      ${escapeHtml(category)}
    </button>
  `).join("");
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  const visibleRewards = activeCategory === "All"
    ? rewards
    : rewards.filter(reward => reward.category === activeCategory);

  if (visibleRewards.length === 0) {
    grid.innerHTML = "<p style='padding:40px'>No rewards found.</p>";
    return;
  }

  grid.innerHTML = visibleRewards.map(reward => {
    const image = getImageUrl(reward.image);
    const name = escapeHtml(reward.name);
    const cost = Number(reward.cost || 0);
    const icon = escapeHtml(reward.icon || "🎁");
    const canRedeem = dataLoaded && balance >= cost;
    const imageHtml = image
      ? `<img src="${escapeHtml(image)}" alt="${name}">`
      : `<div class="product-icon">${icon}</div>`;

    const editButton = isParent()
      ? `<button class="edit-name-button" onclick="openEditReward(${reward.id})">⚙️ Edit Reward</button>`
      : "";

    return `
      <article class="card">
        <div class="product-image">${imageHtml}</div>
        <div class="product-content">
          <div class="product-name">${name}</div>
          <div class="product-cost">${cost.toLocaleString()} points</div>
          <button class="redeem-button" ${canRedeem ? "" : "disabled"} onclick="openRedeem(${reward.id})">
            ${canRedeem ? "Redeem" : "Not enough points"}
          </button>
          ${editButton}
        </div>
      </article>
    `;
  }).join("");
}

function setCategory(category) {
  activeCategory = category;
  renderFilters();
  renderProducts();
}

function updateBalanceDisplay() {
  const element = document.getElementById("points");
  if (element) element.textContent = balance.toLocaleString();
}

/* =====================================================
   REDEEM
===================================================== */

function openRedeem(id) {
  selectedReward = rewards.find(reward => reward.id === id);
  if (!selectedReward || !dataLoaded) return;

  const name = selectedReward.name;
  const cost = Number(selectedReward.cost || 0);

  if (balance < cost) {
    showToast("Not enough points.");
    return;
  }

  document.getElementById("modalTitle").textContent = `Redeem ${name}?`;
  document.getElementById("modalDescription").textContent = `This reward costs ${cost.toLocaleString()} points.`;
  document.getElementById("modalBalance").innerHTML = `Current balance: <strong>${balance.toLocaleString()} pts</strong><br>After redemption: <strong>${(balance - cost).toLocaleString()} pts</strong>`;
  document.getElementById("overlay").style.display = "flex";
}

function closeModal() {
  document.getElementById("overlay").style.display = "none";
  selectedReward = null;
}

async function confirmRedeem() {
  if (!selectedReward || !dataLoaded || !currentProfile) return;

  const cost = Number(selectedReward.cost || 0);
  if (balance < cost) {
    closeModal();
    showToast("Not enough points.");
    return;
  }

  const newBalance = balance - cost;
  const rewardName = selectedReward.name;
  const confirmButton = document.querySelector("#overlay .confirm");

  if (confirmButton) {
    confirmButton.disabled = true;
    confirmButton.textContent = "Redeeming...";
  }

  try {
    const profileUpdate = await supabaseClient
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", currentProfile.id);

    if (profileUpdate.error) throw profileUpdate.error;

    const historyInsert = await supabaseClient
      .from("redemptions")
      .insert({
        user_id: currentProfile.id,
        reward_id: selectedReward.id,
        reward_name: rewardName,
        cost
      })
      .select()
      .single();

    if (historyInsert.error) {
      await supabaseClient
        .from("profiles")
        .update({ balance })
        .eq("id", currentProfile.id);
      throw historyInsert.error;
    }

    balance = newBalance;
    currentProfile.balance = newBalance;
    redemptionHistory.unshift(historyInsert.data);
    updateUserHeader();
    closeModal();
    renderProducts();
    renderAccountMenu();
    showToast(`${rewardName} redeemed successfully`);
  } catch (error) {
    console.error("Redeem error:", error);
    showToast(`Unable to redeem reward: ${error.message || error}`);
  } finally {
    if (confirmButton) {
      confirmButton.disabled = false;
      confirmButton.textContent = "Redeem";
    }
  }
}

/* =====================================================
   EDIT REWARD — PARENT ONLY
===================================================== */

function openEditReward(id) {
  if (!isParent()) {
    showToast("Only Parent can edit rewards.");
    return;
  }

  editingReward = rewards.find(reward => reward.id === id);
  if (!editingReward) return;

  pendingPhotoFile = null;
  photoRemoved = false;

  const nameInput = document.getElementById("editRewardName");
  const costInput = document.getElementById("editRewardCost");
  if (nameInput) nameInput.value = editingReward.name || "";
  if (costInput) costInput.value = Number(editingReward.cost || 0);

  renderEditPhoto();
  document.getElementById("editOverlay").style.display = "flex";
}

function closeEditReward() {
  document.getElementById("editOverlay").style.display = "none";
  editingReward = null;
  pendingPhotoFile = null;
  photoRemoved = false;
}

function renderEditPhoto() {
  const preview = document.getElementById("editPhotoPreview");
  if (!preview || !editingReward) return;

  if (photoRemoved) {
    preview.innerHTML = `<div class="preview-icon">${escapeHtml(editingReward.icon || "🎁")}</div>`;
    return;
  }

  if (pendingPhotoFile) {
    const reader = new FileReader();
    reader.onload = event => {
      preview.innerHTML = `<img src="${event.target.result}" alt="Reward preview">`;
    };
    reader.readAsDataURL(pendingPhotoFile);
    return;
  }

  const image = getImageUrl(editingReward.image);
  preview.innerHTML = image
    ? `<img src="${escapeHtml(image)}" alt="Reward preview">`
    : `<div class="preview-icon">${escapeHtml(editingReward.icon || "🎁")}</div>`;
}

function chooseRewardPhoto() {
  if (!isParent()) return;
  const input = document.getElementById("rewardPhotoInput");
  if (!input) return;
  input.value = "";
  input.click();
}

function handlePhotoSelection(event) {
  if (!isParent()) return;
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("Please choose an image.");
    return;
  }
  pendingPhotoFile = file;
  photoRemoved = false;
  renderEditPhoto();
}

function removeRewardPhoto() {
  if (!isParent() || !editingReward) return;
  pendingPhotoFile = null;
  photoRemoved = true;
  renderEditPhoto();
}

async function uploadRewardPhoto(file, id) {
  const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "jpg";
  const path = `reward-${id}-${Date.now()}.${extension}`;
  const upload = await supabaseClient.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (upload.error) throw upload.error;
  return path;
}

async function deleteRewardPhoto(imagePath) {
  if (!imagePath || imagePath.startsWith("http://") || imagePath.startsWith("https://") || imagePath.startsWith("data:")) return;
  const remove = await supabaseClient.storage.from(IMAGE_BUCKET).remove([imagePath]);
  if (remove.error) console.warn("Unable to delete old reward photo:", remove.error);
}

async function saveEditedReward() {
  if (!isParent() || !editingReward) return;

  const id = editingReward.id;
  const oldImagePath = editingReward.image || null;
  const newName = document.getElementById("editRewardName").value.trim();
  const newCost = Number(document.getElementById("editRewardCost").value);

  if (!newName) {
    showToast("Reward name cannot be empty.");
    return;
  }

  if (!Number.isFinite(newCost) || newCost < 0 || !Number.isInteger(newCost)) {
    showToast("Please enter a whole number for points.");
    return;
  }

  const saveButton = document.querySelector(".save-edit-button");
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
  }

  try {
    let imagePath = oldImagePath;
    if (pendingPhotoFile) imagePath = await uploadRewardPhoto(pendingPhotoFile, id);
    if (photoRemoved) imagePath = null;

    const update = await supabaseClient
      .from("rewards")
      .update({ name: newName, cost: newCost, image: imagePath })
      .eq("id", id);

    if (update.error) throw update.error;

    if (oldImagePath && imagePath !== oldImagePath) await deleteRewardPhoto(oldImagePath);

    closeEditReward();
    await loadRewards();
    showToast("Reward updated successfully.");
  } catch (error) {
    console.error("Save reward error:", error);
    showToast(`Unable to save reward: ${error.message || error}`);
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = "Save changes";
    }
  }
}

/* =====================================================
   HISTORY
===================================================== */

function showHistory() {
  if (!dataLoaded || redemptionHistory.length === 0) {
    showToast("No redemption history yet.");
    return;
  }

  showToast(
    redemptionHistory
      .map(item => `${item.reward_name} (-${item.cost} pts)`)
      .join(" • ")
  );
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

/* =====================================================
   INITIALIZE
===================================================== */

async function initializeApp() {
  const profilesLoaded = await loadProfiles();
  if (!profilesLoaded) return;

  updateUserHeader();
  renderAccountMenu();

  const cloudLoaded = await loadCloudData();
  if (!cloudLoaded) return;

  await loadRewards();
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("rewardPhotoInput");
  if (input) input.addEventListener("change", handlePhotoSelection);
  initializeApp();
});