```javascript
/* =====================================================
   SUPABASE CONFIG
===================================================== */

const SUPABASE_URL =
  "https://omvmjspbrugjjlerrkrf.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_2cz1Ovi8mEhXTft6UfHXoQ_uXSF8bn4";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =====================================================
   REWARDS
===================================================== */

let rewards = [];


/* =====================================================
   BALANCE
===================================================== */

let balance =
  Number(
    localStorage.getItem(
      "familyRewardsBalance"
    )
  );


if (
  Number.isNaN(balance)
) {

  balance = 2450;

}


/* =====================================================
   HISTORY
===================================================== */

let redemptionHistory =
  JSON.parse(
    localStorage.getItem(
      "familyRewardsHistory"
    ) || "[]"
  );


/* =====================================================
   STATE
===================================================== */

let selectedReward = null;

let editingReward = null;

let activeCategory = "All";

let pendingPhoto = null;

let photoRemoved = false;


/* =====================================================
   SUPABASE IMAGE URL
===================================================== */

function getStorageImageUrl(
  path
) {

  if (!path) {
    return null;
  }

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:")
  ) {

    return path;

  }

  const {
    data
  } =
    supabaseClient
      .storage
      .from("product-images")
      .getPublicUrl(path);

  return data?.publicUrl || null;

}


/* =====================================================
   GET NAME
===================================================== */

function getRewardName(
  reward
) {

  return reward.name || "";

}


/* =====================================================
   GET IMAGE
===================================================== */

function getRewardImage(
  reward
) {

  return (
    getStorageImageUrl(
      reward.image
    ) ||
    null
  );

}


/* =====================================================
   GET COST
===================================================== */

function getRewardCost(
  reward
) {

  return Number(
    reward.cost || 0
  );

}


/* =====================================================
   SAVE BALANCE
===================================================== */

function saveBalance() {

  localStorage.setItem(
    "familyRewardsBalance",
    balance.toString()
  );

}


/* =====================================================
   SAVE HISTORY
===================================================== */

function saveHistory() {

  localStorage.setItem(
    "familyRewardsHistory",
    JSON.stringify(
      redemptionHistory
    )
  );

}


/* =====================================================
   LOAD REWARDS FROM SUPABASE
===================================================== */

async function loadRewards() {

  const grid =
    document.getElementById(
      "productGrid"
    );

  if (grid) {

    grid.innerHTML = `

      <div
        style="
          grid-column: 1 / -1;
          text-align: center;
          padding: 40px;
        "
      >
        Loading rewards...
      </div>

    `;

  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from("rewards")
      .select(
        "id,name,cost,category,image,icon"
      )
      .order(
        "id",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "Supabase rewards error:",
      error
    );


    if (grid) {

      grid.innerHTML = `

        <div
          style="
            grid-column: 1 / -1;
            text-align: center;
            padding: 40px;
          "
        >

          <strong>
            Unable to load rewards.
          </strong>

          <br><br>

          Please check your Supabase
          connection and policies.

        </div>

      `;

    }

    return;

  }


  rewards =
    data || [];


  if (
    rewards.length === 0
  ) {

    if (grid) {

      grid.innerHTML = `

        <div
          style="
            grid-column: 1 / -1;
            text-align: center;
            padding: 40px;
          "
        >
          No rewards found.
        </div>

      `;

    }

    return;

  }


  renderFilters();

  renderProducts();

}


/* =====================================================
   CATEGORIES
===================================================== */

function getCategories() {

  return [

    "All",

    ...new Set(
      rewards
        .map(
          reward =>
            reward.category
        )
        .filter(Boolean)
    )

  ];

}


/* =====================================================
   RENDER FILTERS
===================================================== */

function renderFilters() {

  const container =
    document.getElementById(
      "filters"
    );


  if (!container) {
    return;
  }


  const categories =
    getCategories();


  container.innerHTML =
    categories
      .map(
        category => {

          return `

            <button
              class="filter ${
                category ===
                activeCategory
                  ? "active"
                  : ""
              }"
              onclick="setCategory('${escapeHtml(category)}')"
            >

              ${escapeHtml(category)}

            </button>

          `;

        }
      )
      .join("");

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(
  value
) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* =====================================================
   OPEN EDIT REWARD
===================================================== */

function openEditReward(
  id
) {

  const reward =
    rewards.find(
      reward =>
        reward.id === id
    );


  if (!reward) {
    return;
  }


  editingReward =
    reward;


  pendingPhoto =
    null;


  photoRemoved =
    false;


  document.getElementById(
    "editRewardName"
  ).value =
    getRewardName(
      reward
    );


  document.getElementById(
    "editRewardCost"
  ).value =
    getRewardCost(
      reward
    );


  renderEditPhoto();


  document.getElementById(
    "editOverlay"
  ).style.display =
    "flex";

}


/* =====================================================
   CLOSE EDIT REWARD
===================================================== */

function closeEditReward() {

  document.getElementById(
    "editOverlay"
  ).style.display =
    "none";


  editingReward =
    null;


  pendingPhoto =
    null;


  photoRemoved =
    false;

}


/* =====================================================
   RENDER EDIT PHOTO
===================================================== */

function renderEditPhoto() {

  const preview =
    document.getElementById(
      "editPhotoPreview"
    );


  if (
    !preview ||
    !editingReward
  ) {

    return;

  }


  let image =
    null;


  if (
    pendingPhoto
  ) {

    image =
      pendingPhoto;

  } else if (
    !photoRemoved
  ) {

    image =
      getRewardImage(
        editingReward
      );

  }


  if (image) {

    preview.innerHTML = `

      <img
        src="${image}"
        alt="Reward preview"
      >

    `;

    return;

  }


  preview.innerHTML = `

    <div class="preview-icon">
      ${
        escapeHtml(
          editingReward.icon ||
          "🎁"
        )
      }
    </div>

  `;

}


/* =====================================================
   CHOOSE PHOTO
===================================================== */

function chooseRewardPhoto() {

  const input =
    document.getElementById(
      "rewardPhotoInput"
    );


  if (!input) {
    return;
  }


  input.value = "";

  input.click();

}


/* =====================================================
   PHOTO INPUT
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    const input =
      document.getElementById(
        "rewardPhotoInput"
      );


    if (!input) {
      return;
    }


    input.addEventListener(
      "change",
      function () {

        const file =
          input.files[0];


        if (!file) {
          return;
        }


        if (
          !file.type.startsWith(
            "image/"
          )
        ) {

          showToast(
            "Please choose an image."
          );

          return;

        }


        const reader =
          new FileReader();


        reader.onload =
          function (
            event
          ) {

            pendingPhoto =
              event.target.result;


            photoRemoved =
              false;


            renderEditPhoto();

          };


        reader.onerror =
          function () {

            showToast(
              "Unable to read this photo."
            );

          };


        reader.readAsDataURL(
          file
        );

      }
    );

  }
);


/* =====================================================
   REMOVE PHOTO
===================================================== */

function removeRewardPhoto() {

  if (!editingReward) {
    return;
  }


  pendingPhoto =
    null;


  photoRemoved =
    true;


  renderEditPhoto();

}


/* =====================================================
   UPLOAD IMAGE TO SUPABASE STORAGE
===================================================== */

async function uploadRewardImage(
  rewardId,
  dataUrl
) {

  const response =
    await fetch(
      dataUrl
    );


  const blob =
    await response.blob();


  const extension =
    (
      blob.type.split("/")[1] ||
      "jpg"
    )
      .replace(
        "jpeg",
        "jpg"
      );


  const filePath =
    `reward-${rewardId}-${Date.now()}.${extension}`;


  const {
    error
  } =
    await supabaseClient
      .storage
      .from("product-images")
      .upload(
        filePath,
        blob,
        {
          contentType:
            blob.type,
          upsert: false
        }
      );


  if (error) {

    throw error;

  }


  return filePath;

}


/* =====================================================
   DELETE OLD IMAGE
===================================================== */

async function deleteRewardImage(
  imagePath
) {

  if (!imagePath) {
    return;
  }


  if (
    imagePath.startsWith(
      "http://"
    ) ||
    imagePath.startsWith(
      "https://"
    ) ||
    imagePath.startsWith(
      "data:"
    )
  ) {

    return;

  }


  const {
    error
  } =
    await supabaseClient
      .storage
      .from("product-images")
      .remove([
        imagePath
      ]);


  if (error) {

    console.warn(
      "Unable to delete old image:",
      error
    );

  }

}


/* =====================================================
   SAVE EDITED REWARD
===================================================== */

async function saveEditedReward() {

  if (!editingReward) {
    return;
  }


  const id =
    editingReward.id;


  const nameInput =
    document.getElementById(
      "editRewardName"
    );


  const costInput =
    document.getElementById(
      "editRewardCost"
    );


  const newName =
    nameInput.value.trim();


  const newCost =
    Number(
      costInput.value
    );


  if (
    newName === ""
  ) {

    showToast(
      "Reward name cannot be empty."
    );

    return;

  }


  if (
    !Number.isFinite(
      newCost
    ) ||
    newCost < 0 ||
    !Number.isInteger(
      newCost
    )
  ) {

    showToast(
      "Please enter a whole number for points."
    );

    return;

  }


  const saveButton =
    document.querySelector(
      ".save-edit-button"
    );


  if (saveButton) {

    saveButton.disabled =
      true;

    saveButton.textContent =
      "Saving...";

  }


  try {

    let newImagePath =
      editingReward.image;


    const oldImagePath =
      editingReward.image;


    /* -----------------------------------------
       NEW PHOTO
    ----------------------------------------- */

    if (
      pendingPhoto
    ) {

      newImagePath =
        await uploadRewardImage(
          id,
          pendingPhoto
        );

    }


    /* -----------------------------------------
       REMOVE PHOTO
    ----------------------------------------- */

    if (
      photoRemoved &&
      !pendingPhoto
    ) {

      newImagePath =
        null;

    }


    /* -----------------------------------------
       UPDATE REWARDS TABLE
    ----------------------------------------- */

    const {
      data,
      error
    } =
      await supabaseClient
        .from("rewards")
        .update({

          name:
            newName,

          cost:
            newCost,

          image:
            newImagePath

        })
        .eq(
          "id",
          id
        )
        .select(
          "id,name,cost,category,image,icon"
        )
        .single();


    if (error) {

      throw error;

    }


    /* -----------------------------------------
       DELETE OLD IMAGE
    ----------------------------------------- */

    if (
      pendingPhoto &&
      oldImagePath &&
      oldImagePath !==
        newImagePath
    ) {

      await deleteRewardImage(
        oldImagePath
      );

    }


    if (
      photoRemoved &&
      oldImagePath
    ) {

      await deleteRewardImage(
        oldImagePath
      );

    }


    /* -----------------------------------------
       UPDATE LOCAL ARRAY
    ----------------------------------------- */

    const index =
      rewards.findIndex(
        reward =>
          reward.id === id
      );


    if (
      index !== -1
    ) {

      rewards[index] =
        data;

    }


    closeEditReward();

    renderFilters();

    renderProducts();


    showToast(
      "Reward updated successfully."
    );


  } catch (
    error
  ) {

    console.error(
      "Save reward error:",
      error
    );


    showToast(
      "Unable to save reward. Check Supabase policies."
    );


  } finally {

    if (saveButton) {

      saveButton.disabled =
        false;

      saveButton.textContent =
        "Save changes";

    }

  }

}


/* =====================================================
   RENDER PRODUCTS
===================================================== */

function renderProducts() {

  const grid =
    document.getElementById(
      "productGrid"
    );


  if (!grid) {
    return;
  }


  let visibleRewards;


  if (
    activeCategory ===
    "All"
  ) {

    visibleRewards =
      rewards;

  } else {

    visibleRewards =
      rewards.filter(
        reward =>
          reward.category ===
          activeCategory
      );

  }


  grid.innerHTML =
    visibleRewards
      .map(
        reward => {

          const rewardName =
            getRewardName(
              reward
            );


          const rewardImage =
            getRewardImage(
              reward
            );


          const rewardCost =
            getRewardCost(
              reward
            );


          const canRedeem =
            balance >=
            rewardCost;


          return `

            <article
              class="card"
            >

              <div
                class="product-image"
              >

                ${
                  rewardImage

                    ? `

                      <img
                        src="${rewardImage}"
                        alt="${escapeHtml(
                          rewardName
                        )}"
                      >

                    `

                    : `

                      <div
                        class="product-icon"
                      >

                        ${
                          escapeHtml(
                            reward.icon ||
                            ""
                          )
                        }

                      </div>

                    `
                }

              </div>


              <div
                class="product-content"
              >

                <div
                  class="product-name"
                >
                  ${escapeHtml(
                    rewardName
                  )}
                </div>


                <div
                  class="product-cost"
                >

                  ${
                    rewardCost.toLocaleString()
                  }

                  points

                </div>


                <button
                  class="redeem-button"
                  ${
                    canRedeem
                      ? ""
                      : "disabled"
                  }
                  onclick="openRedeem(${reward.id})"
                >

                  ${
                    canRedeem
                      ? "Redeem"
                      : "Not enough points"
                  }

                </button>


                <button
                  class="edit-name-button"
                  onclick="openEditReward(${reward.id})"
                >
                  ⚙️ Edit Reward
                </button>

              </div>

            </article>

          `;

        }
      )
      .join("");

}


/* =====================================================
   UPDATE BALANCE
===================================================== */

function updateBalanceDisplay() {

  const pointsElement =
    document.getElementById(
      "points"
    );


  if (!pointsElement) {
    return;
  }


  pointsElement.textContent =
    balance.toLocaleString();

}


/* =====================================================
   CATEGORY
===================================================== */

function setCategory(
  category
) {

  activeCategory =
    category;

  renderFilters();

  renderProducts();

}


/* =====================================================
   OPEN REDEEM
===================================================== */

function openRedeem(
  id
) {

  selectedReward =
    rewards.find(
      reward =>
        reward.id === id
    );


  if (!selectedReward) {
    return;
  }


  const rewardName =
    getRewardName(
      selectedReward
    );


  const rewardCost =
    getRewardCost(
      selectedReward
    );


  document.getElementById(
    "modalTitle"
  ).textContent =
    `Redeem ${rewardName}?`;


  document.getElementById(
    "modalDescription"
  ).textContent =
    `This reward costs ${
      rewardCost.toLocaleString()
    } points.`;


  const afterBalance =
    balance -
    rewardCost;


  document.getElementById(
    "modalBalance"
  ).innerHTML = `

    Current balance:

    <strong>
      ${balance.toLocaleString()}
      pts
    </strong>

    <br>

    After redemption:

    <strong>
      ${afterBalance.toLocaleString()}
      pts
    </strong>

  `;


  document.getElementById(
    "overlay"
  ).style.display =
    "flex";

}


/* =====================================================
   CLOSE REDEEM
===================================================== */

function closeModal() {

  document.getElementById(
    "overlay"
  ).style.display =
    "none";


  selectedReward =
    null;

}


/* =====================================================
   CONFIRM REDEEM
===================================================== */

function confirmRedeem() {

  if (!selectedReward) {
    return;
  }


  const rewardCost =
    getRewardCost(
      selectedReward
    );


  if (
    balance <
    rewardCost
  ) {

    closeModal();


    showToast(
      "Not enough points."
    );


    return;

  }


  balance -=
    rewardCost;


  const rewardName =
    getRewardName(
      selectedReward
    );


  redemptionHistory.push({

    reward:
      rewardName,

    cost:
      rewardCost,

    date:
      new Date()
        .toLocaleDateString()

  });


  saveBalance();

  saveHistory();

  updateBalanceDisplay();


  closeModal();

  renderProducts();


  showToast(
    `${rewardName} redeemed successfully`
  );

}


/* =====================================================
   TOAST
===================================================== */

function showToast(
  message
) {

  const toast =
    document.getElementById(
      "toast"
    );


  if (!toast) {
    return;
  }


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  setTimeout(
    () => {

      toast.classList.remove(
        "show"
      );

    },
    2400
  );

}


/* =====================================================
   HISTORY
===================================================== */

function showHistory() {

  if (
    redemptionHistory.length ===
    0
  ) {

    showToast(
      "No redemption history yet."
    );


    return;

  }


  const latest =
    redemptionHistory
      .map(
        item =>
          `${item.reward} (-${item.cost} pts)`
      )
      .join(" • ");


  showToast(
    latest
  );

}


/* =====================================================
   INITIALIZE
===================================================== */

updateBalanceDisplay();

loadRewards();
```
