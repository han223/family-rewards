/* =====================================================
   SUPABASE CONFIG
===================================================== */

const SUPABASE_URL = "https://omvmjspbrugjjlerrkrf.supabase.co";
const SUPABASE_KEY = "sb_publishable_2cz1Ovi8mEhXTft6UfHXoQ_uXSF8bn4";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const IMAGE_BUCKET = "product-images";
const PROFILE_ID = 1;

let rewards = [];
let activeCategory = "All";
let selectedReward = null;
let editingReward = null;
let pendingPhotoFile = null;
let photoRemoved = false;
let balance = 0;
let redemptionHistory = [];
let dataLoaded = false;

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

function showLoginScreen() {
  const login = document.getElementById("loginScreen");
  const app = document.getElementById("app");
  if (login) login.style.display = "flex";
  if (app) app.style.display = "none";
}

function showAppScreen() {
  const login = document.getElementById("loginScreen");
  const app = document.getElementById("app");
  if (login) login.style.display = "none";
  if (app) app.style.display = "block";
}

function setLoginError(message) {
  const element = document.getElementById("loginError");
  if (element) element.textContent = message || "";
}

async function login(event) {
  event.preventDefault();
  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value;
  const button = document.getElementById("loginButton");

  setLoginError("");
  if (button) {
    button.disabled = true;
    button.textContent = "Logging in...";
  }

  const result = await supabaseClient.auth.signInWithPassword({ email, password });

  if (result.error) {
    console.error("Login error:", result.error);
    setLoginError(result.error.message || "Unable to log in.");
    if (button) {
      button.disabled = false;
      button.textContent = "Log in";
    }
    return;
  }

  await startAuthenticatedApp(result.data.user);
  if (button) {
    button.disabled = false;
    button.textContent = "Log in";
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  dataLoaded = false;
  rewards = [];
  redemptionHistory = [];
  balance = 0;
  showLoginScreen();
}

async function startAuthenticatedApp(user) {
  showAppScreen();
  setLoginError("");

  const profileResult = await supabaseClient
    .from("profiles")
    .select("id,name,balance,role")
    .eq("id", PROFILE_ID)
    .single();

  if (profileResult.error) {
    console.error("Profile load error:", profileResult.error);
    showLoginScreen();
    setLoginError("Login succeeded, but your Family Rewards profile could not be loaded.");
    return;
  }

  const profile = profileResult.data;
  const userName = profile.name || user.email?.split("@")[0] || "User";
  const userNameElement = document.getElementById("userName");
  const avatarElement = document.getElementById("userAvatar");
  if (userNameElement) userNameElement.textContent = userName;
  if (avatarElement) avatarElement.textContent = userName.charAt(0).toUpperCase();

  await initializeApp();
}

async function checkAuth() {
  const result = await supabaseClient.auth.getSession();
  if (result.error) {
    console.error("Session error:", result.error);
    showLoginScreen();
    return;
  }

  if (result.data.session?.user) {
    await startAuthenticatedApp(result.data.session.user);
  } else {
    showLoginScreen();
  }
}

async function loadCloudData() {
  console.log("Loading balance and redemption history from Supabase...");

  const profileResult = await supabaseClient
    .from("profiles")
    .select("id,name,balance,role")
    .eq("id", PROFILE_ID)
    .single();

  if (profileResult.error) {
    console.error("Profile load error:", profileResult.error);
    showToast("Unable to load points from cloud.");
    return false;
  }

  balance = Number(profileResult.data.balance || 0);

  const historyResult = await supabaseClient
    .from("redemptions")
    .select("id,user_id,reward_id,reward_name,cost,created_at")
    .eq("user_id", PROFILE_ID)
    .order("created_at", { ascending: false });

  if (historyResult.error) {
    console.error("Redemption history load error:", historyResult.error);
    showToast("Unable to load redemption history.");
    return false;
  }

  redemptionHistory = historyResult.data || [];
  dataLoaded = true;
  updateBalanceDisplay();
  return true;
}

async function loadRewards() {
  console.log("Loading rewards from Supabase...");
  const result = await supabaseClient
    .from("rewards")
    .select("id,name,cost,category,image,icon")
    .order("id", { ascending: true });

  console.log("Supabase result:", result);

  if (result.error) {
    console.error("Supabase error:", result.error);
    const grid = document.getElementById("productGrid");
    if (grid) grid.innerHTML = "<p style='padding:40px'>Unable to load rewards. Check the browser Console.</p>";
    return;
  }

  rewards = result.data || [];
  renderFilters();
  renderProducts();
}

function renderFilters() {
  const container = document.getElementById("filters");
  if (!container) return;
  const categories = ["All", ...new Set(rewards.map(reward => reward.category).filter(Boolean))];
  container.innerHTML = categories.map(category => {
    const active = category === activeCategory ? "active" : "";
    return `<button class="filter ${active}" onclick="setCategory('${escapeHtml(category)}')">${escapeHtml(category)}</button>`;
  }).join("");
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

    return `<article class="card">
      <div class="product-image">${imageHtml}</div>
      <div class="product-content">
        <div class="product-name">${name}</div>
        <div class="product-cost">${cost.toLocaleString()} points</div>
        <button class="redeem-button" ${canRedeem ? "" : "disabled"} onclick="openRedeem(${reward.id})">
          ${canRedeem ? "Redeem" : "Not enough points"}
        </button>
        <button class="edit-name-button" onclick="openEditReward(${reward.id})">⚙️ Edit Reward</button>
      </div>
    </article>`;
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
  if (!selectedReward || !dataLoaded) return;

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
      .eq("id", PROFILE_ID);

    if (profileUpdate.error) throw profileUpdate.error;

    const historyInsert = await supabaseClient
      .from("redemptions")
      .insert({
        user_id: PROFILE_ID,
        reward_id: selectedReward.id,
        reward_name: rewardName,
        cost: cost
      })
      .select()
      .single();

    if (historyInsert.error) {
      await supabaseClient
        .from("profiles")
        .update({ balance: balance })
        .eq("id", PROFILE_ID);
      throw historyInsert.error;
    }

    balance = newBalance;
    redemptionHistory.unshift(historyInsert.data);
    updateBalanceDisplay();
    closeModal();
    renderProducts();
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

function openEditReward(id) {
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
  const input = document.getElementById("rewardPhotoInput");
  if (!input) return;
  input.value = "";
  input.click();
}

function handlePhotoSelection(event) {
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
  if (!editingReward) return;
  pendingPhotoFile = null;
  photoRemoved = true;
  renderEditPhoto();
}

async function uploadRewardPhoto(file, id) {
  const extension = file.name.includes(".")
    ? file.name.split(".").pop().toLowerCase()
    : "jpg";
  const path = `reward-${id}-${Date.now()}.${extension}`;

  const upload = await supabaseClient.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (upload.error) throw upload.error;
  return path;
}

async function deleteRewardPhoto(imagePath) {
  if (!imagePath || imagePath.startsWith("http://") || imagePath.startsWith("https://") || imagePath.startsWith("data:")) return;

  const remove = await supabaseClient.storage
    .from(IMAGE_BUCKET)
    .remove([imagePath]);

  if (remove.error) {
    console.warn("Unable to delete old reward photo:", remove.error);
  }
}

async function saveEditedReward() {
  if (!editingReward) return;

  const id = editingReward.id;
  const oldImagePath = editingReward.image || null;
  const nameInput = document.getElementById("editRewardName");
  const costInput = document.getElementById("editRewardCost");
  const newName = nameInput.value.trim();
  const newCost = Number(costInput.value);

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

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

function showHistory() {
  if (!dataLoaded || redemptionHistory.length === 0) {
    showToast("No redemption history yet.");
    return;
  }

  const latest = redemptionHistory
    .map(item => {
      const date = item.created_at
        ? new Date(item.created_at).toLocaleDateString()
        : "";
      return `${item.reward_name} (-${Number(item.cost).toLocaleString()} pts)${date ? ` · ${date}` : ""}`;
    })
    .join(" • ");

  showToast(latest);
}

async function initializeApp() {
  const cloudLoaded = await loadCloudData();
  if (!cloudLoaded) {
    const grid = document.getElementById("productGrid");
    if (grid) grid.innerHTML = "<p style='padding:40px'>Unable to load your points. Please refresh the page.</p>";
    return;
  }

  renderProducts();
  await loadRewards();
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("rewardPhotoInput");
  if (input) input.addEventListener("change", handlePhotoSelection);

  const form = document.getElementById("loginForm");
  if (form) form.addEventListener("submit", login);

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_OUT") {
      showLoginScreen();
    }
  });

  checkAuth();
});
