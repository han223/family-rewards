/* =====================================================
   REDEMPTION HISTORY
   Children see their own history. Parent sees family history.
===================================================== */

(function () {
  function historyAvatar(name) {
    if (typeof cuteAvatarSvg === "function") return cuteAvatarSvg(name);
    if (typeof getAvatar === "function") return getAvatar(name);
    return "👤";
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function ensureModal() {
    let modal = document.getElementById("historyOverlay");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "historyOverlay";
    modal.className = "overlay history-overlay";
    modal.innerHTML = `
      <div class="history-modal" role="dialog" aria-modal="true" aria-labelledby="historyTitle">
        <div class="history-header">
          <div>
            <div class="history-kicker">Family Rewards</div>
            <h2 id="historyTitle">Redemption History</h2>
            <p id="historySubtitle">Your recent rewards</p>
          </div>
          <button class="history-close" type="button" aria-label="Close">×</button>
        </div>
        <div id="historyContent" class="history-content"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector(".history-close").addEventListener("click", closeHistory);
    modal.addEventListener("click", event => {
      if (event.target === modal) closeHistory();
    });
    return modal;
  }

  function closeHistory() {
    const modal = document.getElementById("historyOverlay");
    if (modal) modal.style.display = "none";
  }

  async function showHistory() {
    if (!window.currentProfile || !window.supabaseClient) return;

    const modal = ensureModal();
    const content = modal.querySelector("#historyContent");
    const subtitle = modal.querySelector("#historySubtitle");
    const isParentAccount = String(window.currentProfile.role || "").toLowerCase() === "parent";

    content.innerHTML = '<div class="history-loading"><span class="history-spinner"></span>Loading history...</div>';
    subtitle.textContent = isParentAccount ? "Recent activity from the whole family" : "Your recent rewards";
    modal.style.display = "flex";

    try {
      let query = window.supabaseClient
        .from("redemptions")
        .select("id,user_id,reward_id,reward_name,cost,created_at")
        .order("created_at", { ascending: false });

      if (!isParentAccount) query = query.eq("user_id", window.currentProfile.id);

      const result = await query;
      if (result.error) throw result.error;

      const rows = result.data || [];
      if (!rows.length) {
        content.innerHTML = `
          <div class="history-empty">
            <div class="history-empty-icon">🎁</div>
            <strong>No redemptions yet</strong>
            <p>Rewards you redeem will appear here.</p>
          </div>`;
        return;
      }

      const profileMap = new Map((window.profiles || []).map(profile => [Number(profile.id), profile]));
      content.innerHTML = rows.map(item => {
        const profile = profileMap.get(Number(item.user_id));
        const name = profile?.name || (Number(item.user_id) === Number(window.currentProfile.id) ? window.currentProfile.name : "Family member");
        const avatar = historyAvatar(name);
        return `
          <div class="history-item">
            <div class="history-item-avatar">${avatar}</div>
            <div class="history-item-main">
              <div class="history-item-title">${escapeHistory(item.reward_name || "Reward")}</div>
              <div class="history-item-meta">${isParentAccount ? `<strong>${escapeHistory(name)}</strong> · ` : ""}${formatDate(item.created_at)} · ${formatTime(item.created_at)}</div>
            </div>
            <div class="history-item-cost">−${Number(item.cost || 0).toLocaleString()}<small>pts</small></div>
          </div>`;
      }).join("");
    } catch (error) {
      console.error("History error:", error);
      content.innerHTML = `
        <div class="history-empty">
          <div class="history-empty-icon">⚠️</div>
          <strong>Unable to load history</strong>
          <p>${escapeHistory(error.message || "Please try again.")}</p>
        </div>`;
    }
  }

  function escapeHistory(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.showHistory = showHistory;
  window.closeHistory = closeHistory;
})();
