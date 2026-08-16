/* =====================================================
   POINTS HISTORY — REDEMPTION BRIDGE
   Adds each successful reward redemption to points_history.
===================================================== */

(function () {
  const originalConfirmRedeem = window.confirmRedeem;
  if (typeof originalConfirmRedeem !== "function") return;

  window.confirmRedeem = async function () {
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

    let redemptionRecord = null;
    let pointsHistoryRecord = null;
    let balanceUpdated = false;

    try {
      const profileUpdate = await supabaseClient
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", currentProfile.id);

      if (profileUpdate.error) throw profileUpdate.error;
      balanceUpdated = true;

      const historyInsert = await supabaseClient
        .from("points_history")
        .insert({
          user_id: currentProfile.id,
          amount: -cost,
          type: "redemption",
          description: `Redeemed ${rewardName}`
        })
        .select()
        .single();

      if (historyInsert.error) throw historyInsert.error;
      pointsHistoryRecord = historyInsert.data;

      const redemptionInsert = await supabaseClient
        .from("redemptions")
        .insert({
          user_id: currentProfile.id,
          reward_id: selectedReward.id,
          reward_name: rewardName,
          cost
        })
        .select()
        .single();

      if (redemptionInsert.error) throw redemptionInsert.error;
      redemptionRecord = redemptionInsert.data;

      balance = newBalance;
      currentProfile.balance = newBalance;
      redemptionHistory.unshift(redemptionRecord);
      updateUserHeader();
      closeModal();
      renderProducts();
      renderAccountMenu();
      showToast(`${rewardName} redeemed successfully`);
    } catch (error) {
      console.error("Redeem with points history error:", error);

      if (redemptionRecord?.id) {
        await supabaseClient.from("redemptions").delete().eq("id", redemptionRecord.id);
      }

      if (pointsHistoryRecord?.id) {
        await supabaseClient.from("points_history").delete().eq("id", pointsHistoryRecord.id);
      }

      if (balanceUpdated) {
        await supabaseClient
          .from("profiles")
          .update({ balance })
          .eq("id", currentProfile.id);
      }

      showToast(`Unable to redeem reward: ${error.message || error}`);
    } finally {
      if (confirmButton) {
        confirmButton.disabled = false;
        confirmButton.textContent = "Redeem";
      }
    }
  };
})();
