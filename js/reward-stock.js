/* =====================================================
   REWARD STOCK BRIDGE
   Keeps finite reward inventory in sync with successful redemptions.
===================================================== */
(function () {
  const originalConfirmRedeem = window.confirmRedeem;
  if (typeof originalConfirmRedeem !== "function") return;

  window.confirmRedeem = async function () {
    const reward = selectedReward;
    if (!reward || reward.stock === null || reward.stock === undefined) {
      return originalConfirmRedeem();
    }

    const stock = Number(reward.stock);
    if (!Number.isInteger(stock) || stock <= 0) {
      closeModal();
      showToast("This reward is sold out.");
      return;
    }

    const balanceBefore = Number(balance);
    const nextStock = stock - 1;
    const stockUpdate = await supabaseClient
      .from("rewards")
      .update({ stock: nextStock })
      .eq("id", reward.id)
      .eq("stock", stock)
      .select("id,stock")
      .single();

    if (stockUpdate.error) {
      closeModal();
      showToast("This reward was just taken by someone else or is sold out.");
      return;
    }

    reward.stock = nextStock;

    try {
      await originalConfirmRedeem();
    } finally {
      // A successful redemption changes the local balance. If the original
      // redemption failed/rolled back, restore the stock we reserved.
      if (Number(balance) === balanceBefore) {
        await supabaseClient
          .from("rewards")
          .update({ stock })
          .eq("id", reward.id)
          .eq("stock", nextStock);
        reward.stock = stock;
        renderProducts();
      }
    }
  };
})();
