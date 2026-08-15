/* =====================================================
   SUPABASE CONFIG
===================================================== */

const SUPABASE_URL = "https://omvmjspbrugjjlerrkrf.supabase.co";
const SUPABASE_KEY = "sb_publishable_2cz1Ovi8mEhXTft6UfHXoQ_uXSF8bn4";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const IMAGE_BUCKET = "product-images";

let rewards = [];
let activeCategory = "All";
let selectedReward = null;
let editingReward = null;
let pendingPhotoFile = null;
let photoRemoved = false;

let balance = Number(localStorage.getItem("familyRewardsBalance"));
if (Number.isNaN(balance)) balance = 2450;

let redemptionHistory = JSON.parse(localStorage.getItem("familyRewardsHistory") || "[]");

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

async function loadRewards() {
  console.log("Loading rewards from Supabase...");
  const result = await supabaseClient.from("rewards").select("id,name,cost,category,image,icon").order("id", { ascending: true });
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
  const visibleRewards = activeCategory === "All" ? rewards : rewards.filter(reward => reward.category === activeCategory);
  if (visibleRewards.length === 0) {
    grid.innerHTML = "<p style='padding:40px'>No rewards found.</p>";
    return;
  }
  grid.innerHTML = visibleRewards.map(reward => {
    const image = getImageUrl(reward.image);
    const name = escapeHtml(reward.name);
    const cost = Number(reward.cost || 0);
    const icon = escapeHtml(reward.icon || "🎁");
    const canRedeem = balance >= cost;
    const imageHtml = image ? `<img src="${escapeHtml(image)}" alt="${name}">` : `<div class="product-icon">${icon}</div>`;
    return `<article class="card"><div class="product-image">${imageHtml}</div><div class="product-content"><div class="product-name">${name}</div><div class="product-cost">${cost.toLocaleString()} points</div><button class="redeem-button" ${canRedeem ? "" : "disabled"} onclick="openRedeem(${reward.id})">${canRedeem ? "Redeem" : "Not enough points"}</button><button class="edit-name-button" onclick="openEditReward(${reward.id})">⚙️ Edit Reward</button></div></article>`;
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
  if (!selectedReward) return;
  const name = selectedReward.name;
  const cost = Number(selectedReward.cost || 0);
  document.getElementById("modalTitle").textContent = `Redeem ${name}?`;
  document.getElementById("modalDescription").textContent = `This reward costs ${cost.toLocaleString()} points.`;
  document.getElementById("modalBalance").innerHTML = `Current balance: <strong>${balance.toLocaleString()} pts</strong><br>After redemption: <strong>${(balance - cost).toLocaleString()} pts</strong>`;
  document.getElementById("overlay").style.display = "flex";
}

function closeModal() {
  document.getElementById("overlay").style.display = "none";
  selectedReward = null;
}

function confirmRedeem() {
  if (!selectedReward) return;
  const cost = Number(selectedReward.cost || 0);
  if (balance < cost) {
    closeModal();
    showToast("Not enough points.");
    return;
  }
  const rewardName = selectedReward.name;
  balance -= cost;
  redemptionHistory.push({ reward: rewardName, cost: cost, date: new Date().toLocaleDateString() });
  localStorage.setItem("familyRewardsBalance", balance.toString());
  localStorage.setItem("familyRewardsHistory", JSON.stringify(redemptionHistory));
  updateBalanceDisplay();
  closeModal();
  renderProducts();
  showToast(`${rewardName} redeemed successfully`);
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
  preview.innerHTML = image ? `<img src="${escapeHtml(image)}" alt="Reward preview">` : `<div class="preview-icon">${escapeHtml(editingReward.icon || "🎁")}</div>`;
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
  const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "jpg";
  const path = `reward-${id}-${Date.now()}.${extension}`;
  const upload = await supabaseClient.storage.from(IMAGE_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
  if (upload.error) throw upload.error;
  return path;
}

async function deleteRewardPhoto(imagePath) {
  if (!imagePath || imagePath.startsWith("http://") || imagePath.startsWith("https://") || imagePath.startsWith("data:")) return;
  const remove = await supabaseClient.storage.from(IMAGE_BUCKET).remove([imagePath]);
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
    const update = await supabaseClient.from("rewards").update({ name: newName, cost: newCost, image: imagePath }).eq("id", id);
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
  if (redemptionHistory.length === 0) {
    showToast("No redemption history yet.");
    return;
  }
  showToast(redemptionHistory.map(item => `${item.reward} (-${item.cost} pts)`).join(" • "));
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("rewardPhotoInput");
  if (input) input.addEventListener("change", handlePhotoSelection);
});

updateBalanceDisplay();
loadRewards();
