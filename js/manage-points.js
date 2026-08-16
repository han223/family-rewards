/* =====================================================
   PARENT POINT MANAGEMENT
===================================================== */

(function () {
  function isParentAccount() {
    return String(currentProfile?.role || "").toLowerCase() === "parent";
  }

  function ensureManagePointsButton() {
    const list = document.getElementById("accountList");
    if (!list) return;
    const oldButton = document.getElementById("managePointsButton");
    if (oldButton) oldButton.remove();
    if (!isParentAccount()) return;

    const button = document.createElement("button");
    button.id = "managePointsButton";
    button.type = "button";
    button.className = "manage-points-menu-button";
    button.innerHTML = '<span>⭐</span><span><strong>Manage Points</strong><small>Add or remove points from children</small></span>';
    button.addEventListener("click", openManagePoints);
    list.appendChild(button);
  }

  function getChildren() {
    return Array.isArray(profiles)
      ? profiles.filter(profile => String(profile.role || "").toLowerCase() === "child")
      : [];
  }

  function createManageModal() {
    let modal = document.getElementById("managePointsOverlay");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "managePointsOverlay";
    modal.className = "overlay manage-points-overlay";
    modal.innerHTML = `
      <div class="manage-points-modal" role="dialog" aria-modal="true" aria-labelledby="managePointsTitle">
        <div class="manage-points-header">
          <div>
            <div class="manage-points-kicker">Parent controls</div>
            <h2 id="managePointsTitle">Manage Points</h2>
            <p>Add or remove points from your children.</p>
          </div>
          <button type="button" class="manage-points-close" aria-label="Close">×</button>
        </div>
        <div id="managePointsChildren" class="manage-points-children"></div>
        <div class="manage-points-footer"><button type="button" class="manage-points-cancel">Done</button></div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector(".manage-points-close").addEventListener("click", closeManagePoints);
    modal.querySelector(".manage-points-cancel").addEventListener("click", closeManagePoints);
    modal.addEventListener("click", event => { if (event.target === modal) closeManagePoints(); });
    return modal;
  }

  function openManagePoints() {
    if (!isParentAccount()) return;
    const modal = createManageModal();
    const container = modal.querySelector("#managePointsChildren");
    const children = getChildren();

    container.innerHTML = children.length ? children.map(child => {
      const name = String(child.name || "Child");
      const avatar = typeof getAvatar === "function" ? getAvatar(name) : "👤";
      const childBalance = Number(child.balance || 0);
      return `
        <div class="points-child-card" data-profile-id="${Number(child.id)}">
          <div class="points-child-main">
            <div class="points-child-avatar">${avatar}</div>
            <div><strong>${escapeHtml(name)}</strong><span>${childBalance.toLocaleString()} points</span></div>
          </div>
          <div class="points-child-controls">
            <input class="points-amount" type="number" min="1" step="1" inputmode="numeric" placeholder="Amount" />
            <div class="points-action-row">
              <button type="button" class="points-remove">− Remove</button>
              <button type="button" class="points-add">+ Add</button>
            </div>
          </div>
        </div>`;
    }).join("") : '<div class="manage-points-empty">No child accounts found.</div>';

    container.querySelectorAll(".points-child-card").forEach(card => {
      const id = Number(card.dataset.profileId);
      card.querySelector(".points-add").addEventListener("click", () => changePoints(id, card, 1));
      card.querySelector(".points-remove").addEventListener("click", () => changePoints(id, card, -1));
    });
    modal.style.display = "flex";
  }

  function closeManagePoints() {
    const modal = document.getElementById("managePointsOverlay");
    if (modal) modal.style.display = "none";
  }

  async function changePoints(profileId, card, direction) {
    if (!isParentAccount()) return;
    const profile = getChildren().find(item => Number(item.id) === Number(profileId));
    if (!profile) return;

    const input = card.querySelector(".points-amount");
    const amount = Number(input?.value);
    if (!Number.isInteger(amount) || amount <= 0) {
      showToast("Enter a whole number of points first.");
      input?.focus();
      return;
    }

    const currentBalance = Number(profile.balance || 0);
    const newBalance = currentBalance + direction * amount;
    if (newBalance < 0) {
      showToast("A child's balance cannot go below 0.");
      return;
    }

    const buttons = card.querySelectorAll("button");
    buttons.forEach(button => { button.disabled = true; button.textContent = "Saving..."; });

    try {
      const result = await supabaseClient
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", profileId)
        .select("id,name,balance,role")
        .single();
      if (result.error) throw result.error;

      const index = profiles.findIndex(item => Number(item.id) === Number(profileId));
      if (index >= 0) profiles[index] = result.data;
      const balanceLabel = card.querySelector(".points-child-main span");
      if (balanceLabel) balanceLabel.textContent = `${Number(result.data.balance || 0).toLocaleString()} points`;
      input.value = "";
      renderAccountMenu();
      showToast(`${profile.name}: ${direction > 0 ? "+" : "−"}${amount} points`);
    } catch (error) {
      console.error("Manage points error:", error);
      showToast(`Unable to update points: ${error.message || error}`);
    } finally {
      buttons.forEach(button => { button.disabled = false; });
      const remove = card.querySelector(".points-remove");
      const add = card.querySelector(".points-add");
      if (remove) remove.textContent = "− Remove";
      if (add) add.textContent = "+ Add";
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function install() {
    const originalRender = window.renderAccountMenu;
    if (typeof originalRender === "function" && !originalRender.__managePointsWrapped) {
      const wrapped = function () { originalRender(); ensureManagePointsButton(); };
      wrapped.__managePointsWrapped = true;
      window.renderAccountMenu = wrapped;
    }
    const originalToggle = window.toggleAccountMenu;
    if (typeof originalToggle === "function" && !originalToggle.__managePointsWrapped) {
      const wrappedToggle = function () { originalToggle(); ensureManagePointsButton(); };
      wrappedToggle.__managePointsWrapped = true;
      window.toggleAccountMenu = wrappedToggle;
    }
    ensureManagePointsButton();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(install, 0));
  else install();
})();
