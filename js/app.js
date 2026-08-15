const rewards = [

  {
    id: 1,
    name: "Movie Night",
    cost: 500,
    category: "Entertainment",
    image: "assets/images/movie-night.jpg"
  },

  {
    id: 2,
    name: "Ice Cream",
    cost: 300,
    category: "Food",
    icon: "🍦"
  },

  {
    id: 3,
    name: "Choose Dinner",
    cost: 800,
    category: "Privileges",
    icon: "🍽️"
  },

  {
    id: 4,
    name: "Toy of Choice",
    cost: 1200,
    category: "Toys",
    icon: "🧸"
  },

  {
    id: 5,
    name: "Extra Screen Time",
    cost: 400,
    category: "Privileges",
    icon: "📱"
  },

  {
    id: 6,
    name: "Pizza Night",
    cost: 700,
    category: "Food",
    icon: "🍕"
  },

  {
    id: 7,
    name: "Board Game",
    cost: 1000,
    category: "Toys",
    icon: "🎲"
  },

  {
    id: 8,
    name: "Family Outing",
    cost: 1500,
    category: "Entertainment",
    icon: "🎡"
  },

  {
    id: 9,
    name: "Favorite Dessert",
    cost: 350,
    category: "Food",
    icon: "🍰"
  },

  {
    id: 10,
    name: "Skip One Chore",
    cost: 600,
    category: "Privileges",
    icon: "✨"
  },

  {
    id: 11,
    name: "New Book",
    cost: 900,
    category: "Other",
    icon: "📚"
  },

  {
    id: 12,
    name: "$5 Treat",
    cost: 500,
    category: "Other",
    icon: "🎁"
  },

  {
    id: 13,
    name: "Game Night",
    cost: 650,
    category: "Entertainment",
    icon: "🎮"
  },

  {
    id: 14,
    name: "Small Toy",
    cost: 700,
    category: "Toys",
    icon: "🚗"
  },

  {
    id: 15,
    name: "Breakfast Choice",
    cost: 450,
    category: "Food",
    icon: "🥞"
  }

];



/* =====================================================
   SAVED DATA
===================================================== */

const savedNames =
  JSON.parse(
    localStorage.getItem(
      "familyRewardsNames"
    ) || "{}"
  );


const savedImages =
  JSON.parse(
    localStorage.getItem(
      "familyRewardsImages"
    ) || "{}"
  );


const savedCosts =
  JSON.parse(
    localStorage.getItem(
      "familyRewardsCosts"
    ) || "{}"
  );



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
   GET NAME
===================================================== */

function getRewardName(reward) {

  return (
    savedNames[reward.id] ||
    reward.name
  );

}



/* =====================================================
   GET IMAGE
===================================================== */

function getRewardImage(reward) {

  return (
    savedImages[reward.id] ||
    reward.image ||
    null
  );

}



/* =====================================================
   GET COST
===================================================== */

function getRewardCost(reward) {

  if (
    savedCosts[reward.id] !== undefined
  ) {

    return Number(
      savedCosts[reward.id]
    );

  }


  return reward.cost;

}



/* =====================================================
   SAVE NAME
===================================================== */

function saveRewardName(
  id,
  name
) {

  savedNames[id] = name;

  localStorage.setItem(
    "familyRewardsNames",
    JSON.stringify(
      savedNames
    )
  );

}



/* =====================================================
   SAVE IMAGE
===================================================== */

function saveRewardImage(
  id,
  imageData
) {

  savedImages[id] =
    imageData;

  localStorage.setItem(
    "familyRewardsImages",
    JSON.stringify(
      savedImages
    )
  );

}



/* =====================================================
   REMOVE IMAGE
===================================================== */

function removeSavedRewardImage(
  id
) {

  delete savedImages[id];

  localStorage.setItem(
    "familyRewardsImages",
    JSON.stringify(
      savedImages
    )
  );

}



/* =====================================================
   SAVE COST
===================================================== */

function saveRewardCost(
  id,
  cost
) {

  savedCosts[id] =
    cost;

  localStorage.setItem(
    "familyRewardsCosts",
    JSON.stringify(
      savedCosts
    )
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
   CATEGORIES
===================================================== */

const categories = [

  "All",

  ...new Set(
    rewards.map(
      reward =>
        reward.category
    )
  )

];



/* =====================================================
   RENDER FILTERS
===================================================== */

function renderFilters() {

  const container =
    document.getElementById(
      "filters"
    );


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
              onclick="setCategory('${category}')"
            >
              ${category}
            </button>

          `;

        }
      )
      .join("");

}



/* =====================================================
   OPEN EDIT REWARD
===================================================== */

function openEditReward(id) {

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
    getRewardName(reward);


  document.getElementById(
    "editRewardCost"
  ).value =
    getRewardCost(reward);


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


  if (!editingReward) {
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
      ${editingReward.icon || "🎁"}
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
          function (event) {

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
   SAVE EDITED REWARD
===================================================== */

function saveEditedReward() {

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


  saveRewardName(
    id,
    newName
  );


  saveRewardCost(
    id,
    newCost
  );


  if (pendingPhoto) {

    saveRewardImage(
      id,
      pendingPhoto
    );

  }


  if (photoRemoved) {

    removeSavedRewardImage(
      id
    );

  }


  closeEditReward();


  renderProducts();


  showToast(
    "Reward updated successfully."
  );

}



/* =====================================================
   RENDER PRODUCTS
===================================================== */

function renderProducts() {

  const grid =
    document.getElementById(
      "productGrid"
    );


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
                        alt="${rewardName}"
                      >

                    `

                    : `

                      <div
                        class="product-icon"
                      >
                        ${
                          reward.icon ||
                          ""
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
                  ${rewardName}
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

function openRedeem(id) {

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

renderFilters();

renderProducts();
