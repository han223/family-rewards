/* =====================================================
   PARENT POINT MANAGEMENT
===================================================== */

(function () {
  function isParentAccount() {
    return String(currentProfile?.role || "").toLowerCase() === "parent";
  }

  function injectStyles() {
    if (document.getElementById("managePointsStyles")) return;
    const style = document.createElement("style");
    style.id = "managePointsStyles";
    style.textContent = `
      .manage-points-page-button{display:none;align-items:center;justify-content:center;gap:8px;margin:0 0 12px auto;padding:10px 14px;border:1px solid #e2e5df;border-radius:12px;background:#fff;color:#242722;font:600 13px inherit;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.04)}
      .manage-points-page-button:hover{background:#f5f6f2}
      .manage-points-page-button.visible{display:flex}
      .manage-points-page-button span{font-size:17px}
      .manage-points-modal{width:min(560px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;background:#fff;border-radius:22px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.16)}
      .manage-points-header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:20px}
      .manage-points-kicker{text-transform:uppercase;letter-spacing:.08em;font-size:11px;font-weight:700;color:#8b9187;margin-bottom:5px}
      .manage-points-header h2{margin:0;font-size:25px}.manage-points-header p{margin:5px 0 0;color:#7d827a;font-size:13px}
      .manage-points-close{border:0;background:#f2f3ef;width:34px;height:34px;border-radius:50%;font-size:22px;cursor:pointer;color:#5f645d}
      .manage-points-children{display:grid;gap:12px}.points-child-card{border:1px solid #e8eae5;border-radius:16px;padding:15px;display:flex;align-items:center;justify-content:space-between;gap:16px;background:#fcfcfb}
      .points-child-main{display:flex;align-items:center;gap:12px;min-width:0}.points-child-avatar{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#f3f4ef;font-size:26px;flex:none}
      .points-child-main strong,.points-child-main span{display:block}.points-child-main strong{font-size:15px}.points-child-main span{margin-top:3px;color:#81867e;font-size:12px}
      .points-child-controls{width:210px;flex:none}.points-amount{width:100%;box-sizing:border-box;border:1px solid #dfe2db;border-radius:10px;padding:9px 10px;font:inherit;outline:none}.points-amount:focus{border-color:#aeb6a6;box-shadow:0 0 0 3px rgba(174,182,166,.18)}
      .points-action-row{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px}.points-action-row button{border:0;border-radius:9px;padding:8px 6px;font:600 12px inherit;cursor:pointer}.points-remove{background:#f7ecea;color:#9b5148}.points-add{background:#eaf4e8;color:#4e7948}.points-action-row button:disabled{opacity:.55;cursor:wait}
      .manage-points-footer{display:flex;justify-content:flex-end;margin-top:18px}.manage-points-cancel{border:1px solid #dfe2db;background:#fff;border-radius:10px;padding:9px 18px;cursor:pointer;font-weight:600}.manage-points-empty{padding:30px;text-align:center;color:#888d85}
      @media(max-width:560px){.manage-points-page-button{width:100%}.points-child-card{align-items:stretch;flex-direction:column}.points-child-controls{width:100%}.manage-points-modal{padding:18px}}
    `;
    document.head.appendChild(style);
  }

  function ensureManagePointsButton() {
    let button = document.getElementById("managePointsButton");
    const hero = document.querySelector(".hero");
    if (!hero) return;
    if (!button) {
      button = document.createElement("button");
      button.id = "managePointsButton";
      button.type = "button";
      button.className = "manage-points-page-button";
      button.innerHTML = '<span>⭐</span> Manage Points';
      button.addEventListener("click", openManagePoints);
      const historyButton = hero.querySelector(".history-button");
      if (historyButton) historyButton.insertAdjacentElement("beforebegin", button);
      else hero.appendChild(button);
    }
    button.classList.toggle("visible", isParentAccount());
  }

  function getChildren() { return Array.isArray(profiles) ? profiles.filter(profile => String(profile.role || "").toLowerCase() === "child") : []; }

  function createManageModal() {
    let modal = document.getElementById("managePointsOverlay");
    if (modal) return modal;
    modal = document.createElement("div"); modal.id = "managePointsOverlay"; modal.className = "overlay manage-points-overlay";
    modal.innerHTML = `<div class="manage-points-modal" role="dialog" aria-modal="true" aria-labelledby="managePointsTitle"><div class="manage-points-header"><div><div class="manage-points-kicker">Parent controls</div><h2 id="managePointsTitle">Manage Points</h2><p>Add or remove points from your children.</p></div><button type="button" class="manage-points-close" aria-label="Close">×</button></div><div id="managePointsChildren" class="manage-points-children"></div><div class="manage-points-footer"><button type="button" class="manage-points-cancel">Done</button></div></div>`;
    document.body.appendChild(modal); modal.querySelector(".manage-points-close").addEventListener("click", closeManagePoints); modal.querySelector(".manage-points-cancel").addEventListener("click", closeManagePoints); modal.addEventListener("click", event => { if (event.target === modal) closeManagePoints(); }); return modal;
  }

  function openManagePoints() {
    if (!isParentAccount()) return;
    const modal = createManageModal(); const container = modal.querySelector("#managePointsChildren"); const children = getChildren();
    container.innerHTML = children.length ? children.map(child => { const name = String(child.name || "Child"); const avatar = typeof getAvatar === "function" ? getAvatar(name) : "👤"; const childBalance = Number(child.balance || 0); return `<div class="points-child-card" data-profile-id="${Number(child.id)}"><div class="points-child-main"><div class="points-child-avatar">${avatar}</div><div><strong>${escapeHtml(name)}</strong><span>${childBalance.toLocaleString()} points</span></div></div><div class="points-child-controls"><input class="points-amount" type="number" min="1" step="1" inputmode="numeric" placeholder="Amount" /><div class="points-action-row"><button type="button" class="points-remove">− Remove</button><button type="button" class="points-add">+ Add</button></div></div></div>`; }).join("") : '<div class="manage-points-empty">No child accounts found.</div>';
    container.querySelectorAll(".points-child-card").forEach(card => { const id = Number(card.dataset.profileId); card.querySelector(".points-add").addEventListener("click", () => changePoints(id, card, 1)); card.querySelector(".points-remove").addEventListener("click", () => changePoints(id, card, -1)); }); modal.style.display = "flex";
  }

  function closeManagePoints() { const modal = document.getElementById("managePointsOverlay"); if (modal) modal.style.display = "none"; }

  async function changePoints(profileId, card, direction) {
    if (!isParentAccount()) return; const profile = getChildren().find(item => Number(item.id) === Number(profileId)); if (!profile) return;
    const input = card.querySelector(".points-amount"); const amount = Number(input?.value); if (!Number.isInteger(amount) || amount <= 0) { showToast("Enter a whole number of points first."); input?.focus(); return; }
    const currentBalance = Number(profile.balance || 0); const newBalance = currentBalance + direction * amount; if (newBalance < 0) { showToast("A child's balance cannot go below 0."); return; }
    const buttons = card.querySelectorAll("button"); buttons.forEach(button => { button.disabled = true; button.textContent = "Saving..."; });
    try {
      const result = await supabaseClient.from("profiles").update({ balance: newBalance }).eq("id", profileId).select("id,name,balance,role").single(); if (result.error) throw result.error;
      const historyInsert = await supabaseClient.from("points_history").insert({ user_id: profileId, amount: direction * amount, type: "adjustment", description: direction > 0 ? `Points added by ${currentProfile?.name || "Parent"}` : `Points removed by ${currentProfile?.name || "Parent"}` }).select().single();
      if (historyInsert.error) { await supabaseClient.from("profiles").update({ balance: currentBalance }).eq("id", profileId); throw historyInsert.error; }
      const index = profiles.findIndex(item => Number(item.id) === Number(profileId)); if (index >= 0) profiles[index] = result.data;
      const balanceLabel = card.querySelector(".points-child-main span"); if (balanceLabel) balanceLabel.textContent = `${Number(result.data.balance || 0).toLocaleString()} points`; input.value = ""; renderAccountMenu(); ensureManagePointsButton(); showToast(`${profile.name}: ${direction > 0 ? "+" : "−"}${amount} points`);
    } catch (error) { console.error("Manage points error:", error); showToast(`Unable to update points: ${error.message || error}`); }
    finally { buttons.forEach(button => { button.disabled = false; }); const remove = card.querySelector(".points-remove"); const add = card.querySelector(".points-add"); if (remove) remove.textContent = "− Remove"; if (add) add.textContent = "+ Add"; }
  }

  function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
  window.openManagePoints = openManagePoints;
  window.ensureManagePointsButton = ensureManagePointsButton;

  function install() { injectStyles(); ensureManagePointsButton(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(install, 0)); else install();
})();
