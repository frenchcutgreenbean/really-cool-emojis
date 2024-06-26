// ==UserScript==
// @name         really-cool-emojis
// @version      6.9.3
// @namespace    https://github.com/frenchcutgreenbean/
// @description  emojis and img for UNIT3D trackers
// @author       dantayy
// @match        https://blutopia.cc/*
// @match        https://aither.cc/*
// @match        https://reelflix.xyz/*
// @match        https://fearnopeer.com/*
// @match        https://cinematik.net/*
// @icon         https://ptpimg.me/shqsh5.png
// @downloadURL  https://github.com/frenchcutgreenbean/really-cool-emojis/raw/main/really-cool-emojis.user.js
// @updateURL    https://github.com/frenchcutgreenbean/really-cool-emojis/raw/main/really-cool-emojis.user.js
// @grant        GM.xmlHttpRequest
// @license      GPL-3.0-or-later
// ==/UserScript==

/************************************************************************************************
 * ChangeLog
 * 6.9.0
 *  - Complete refactor emojis stored in separate file.
 *  - Search functionality for easy access.
 *  - Tagging for similar querying.
 ************************************************************************************************/

(function () {
  "use strict";

  let emotes = {};

  const currentURL = window.location.href;
  const currURL = new URL(currentURL);
  const rootURL = `${currURL.origin}/`;

  const urlPatterns = [
    { regex: /.*\/torrents\/\d+/, key: "isTorrent" },
    { regex: /.*\/forums\/topics\/\d+/, key: "isForum" },
    { regex: /.\/topics\/forum\/\d+\/create/, key: "isNewTopic" },
    { regex: /.*\/forums\/posts\/\d+\/edit/, key: "isEditTopic" },
    { regex: /.*\/conversations\/create/, key: "isPM" },
    { regex: /.*\/conversations\/\d+/, key: "isReply" },
  ];

  const pageFlags = urlPatterns.reduce((acc, pattern) => {
    acc[pattern.key] = pattern.regex.test(currentURL);
    return acc;
  }, {});

  pageFlags.isChatbox = currentURL === rootURL;

  const menuQuery = {
    h4Heading: "h4.panel__heading",
    forumReply: "#forum_reply_form",
    h2Heading: "h2.panel__heading",
    chatboxMenu: "#chatbox_header div",
  };

  const inputQuery = {
    newComment: "new-comment__textarea",
    bbcodeForum: "bbcode-content",
    chatboxInput: "chatbox__messages-create",
    bbcodePM: "bbcode-message",
  };

  let menuSelector, chatForm;

  function getDOMSelectors() {
    const { h4Heading, forumReply, h2Heading, chatboxMenu } = menuQuery;
    const { newComment, bbcodeForum, chatboxInput, bbcodePM } = inputQuery;

    const selectors = [
      {
        condition: pageFlags.isReply,
        menu: h2Heading,
        input: bbcodePM,
        extraCheck: (el) => el.innerText.toLowerCase().includes("reply"),
      },
      {
        condition:
          pageFlags.isNewTopic || pageFlags.isPM || pageFlags.isEditTopic,
        menu: h2Heading,
        input: pageFlags.isPM ? bbcodePM : bbcodeForum,
      },
      { condition: pageFlags.isTorrent, menu: h4Heading, input: newComment },
      { condition: pageFlags.isForum, menu: forumReply, input: bbcodeForum },
      {
        condition: pageFlags.isChatbox,
        menu: chatboxMenu,
        input: chatboxInput,
      },
    ];

    for (let selector of selectors) {
      if (selector.condition) {
        if (selector.extraCheck) {
          const headings = document.querySelectorAll(selector.menu);
          for (let el of headings) {
            if (selector.extraCheck(el)) {
              menuSelector = el;
              break;
            }
          }
        } else {
          menuSelector = document.querySelector(selector.menu);
        }
        chatForm = document.getElementById(selector.input);
        break;
      }
    }
  }

  // helper function to get size for emote.
  function getEmoteSize(sizePref, emote) {
    if (sizePref === "default") return emote.default_width;
    if (sizePref === "large") return emote.default_width + 10;
    if (sizePref === "small") return emote.default_width - 10;
    if (sizePref === "sfa") return Math.min(emote.default_width + 28, 70);
  }

  let sizePref = "default";

  if (localStorage.getItem("sizePref")) {
    sizePref = localStorage.getItem("sizePref");
  }
  // Helper function to addStyle instead of using GM.addStyle, for compatibility.
  function addStyle(css) {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  async function fetchJSON(jsonUrl) {
    return new Promise((resolve, reject) => {
      try {
        GM.xmlHttpRequest({
          method: "GET",
          url: jsonUrl,
          onload: function (response) {
            try {
              const data = JSON.parse(response.responseText);
              resolve(data);
            } catch (e) {
              reject("Error parsing JSON");
            }
          },
          onerror: function () {
            reject("Network error");
          },
        });
      } catch (error) {
        reject("There was a problem with the fetch operation: " + error);
      }
    });
  }
  async function setEmotes() {
    try {
      emotes = await fetchJSON(
        "https://raw.githubusercontent.com/frenchcutgreenbean/really-cool-emojis/main/emojis.json"
      );
      makeMenu();
    } catch (error) {
      console.error(error);
    }
  }

  /* ----------------------------Emote-Handling------------------------------------- */
  function onEmoteClick(emote) {
    const { url } = emote;
    let size = getEmoteSize(sizePref, emote);
    const emoji = `[img=${size}]${url}[/img]`;
    chatForm.value = chatForm.value
      ? `${chatForm.value.trim()} ${emoji}`
      : emoji;
    chatForm.focus();
    chatForm.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function handleInputChange(e, autofill, useImgTag) {
    const regex = /^(?:!?http.*|l!http.*)\.(jpg|jpeg|png|gif|bmp|webp)$/i;
    const message = e.target.value;
    if (!message) return;

    const messageParts = message.split(/(\s+|\n)/);

    const findLastNonWhitespaceIndex = (arr) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].trim() !== "") return i;
      }
      return -1;
    };

    const lastItemIndex = findLastNonWhitespaceIndex(messageParts);
    const lastItem =
      lastItemIndex >= 0 ? messageParts[lastItemIndex].trim() : "";
    const secondLastItemIndex = findLastNonWhitespaceIndex(
      messageParts.slice(0, lastItemIndex)
    );
    const secondLastItem =
      secondLastItemIndex >= 0 ? messageParts[secondLastItemIndex].trim() : "";

    const setChatFormValue = (value) => {
      chatForm.value = value;
      chatForm.dispatchEvent(new Event("input", { bubbles: true }));
    };

    const emojiCheck = lastItem.slice(1);

    if (
      !lastItem.startsWith("!") &&
      !lastItem.startsWith("l") &&
      !secondLastItem.startsWith("!") &&
      !secondLastItem.startsWith("l")
    ) {
      return;
    }

    if (autofill && emotes[emojiCheck]) {
      let emote = emotes[emojiCheck];
      let size = getEmoteSize(sizePref, emote);
      messageParts[lastItemIndex] = `[img=${size}]${emote.url}[/img]`;
      setChatFormValue(messageParts.join(""));
      return;
    }

    if (useImgTag && regex.test(lastItem)) {
      const applyImgTag = (index, tag) => {
        messageParts[index] = tag;
        messageParts.splice(lastItemIndex, 1);
        setChatFormValue(messageParts.join(""));
      };

      if (secondLastItem.startsWith("!") && parseInt(secondLastItem.slice(1))) {
        applyImgTag(
          secondLastItemIndex,
          `[img=${secondLastItem.slice(1)}]${lastItem}[/img]`
        );
        return;
      }

      if (
        secondLastItem.startsWith("l!") &&
        parseInt(secondLastItem.slice(2))
      ) {
        applyImgTag(
          secondLastItemIndex,
          `[url=${lastItem}][img=${secondLastItem.slice(
            2
          )}]${lastItem}[/img][/url]`
        );
        return;
      }

      if (lastItem.startsWith("!") && !emotes[emojiCheck]) {
        messageParts[lastItemIndex] = `[img]${lastItem.slice(1)}[/img]`;
        setChatFormValue(messageParts.join(""));
        return;
      }

      if (lastItem.startsWith("l!")) {
        messageParts[lastItemIndex] = `[url=${lastItem.slice(
          2
        )}][img]${lastItem.slice(2)}[/img][/url]`;
        setChatFormValue(messageParts.join(""));
        return;
      }
    }
  }
  /* ----------------------------Menus--------------------------------- */
  let emoteMenu;

  function makeMenu() {
    emoteMenu = document.createElement("div");
    emoteMenu.className = "emote-content";

    // Create search bar
    const searchBar = document.createElement("input");
    searchBar.type = "text";
    searchBar.placeholder = "Search emotes...";
    searchBar.className = "emote-search-bar";
    searchBar.addEventListener("input", filterEmotes);

    emoteMenu.appendChild(searchBar);

    // Fill the menu with all the emotes
    for (const [key, value] of Object.entries(emotes)) {
      createEmoteItem(key, value);
    }

    function filterEmotes(event) {
      const searchTerm = event.target.value.toLowerCase();
      const emoteContainers = emoteMenu.querySelectorAll(".emote-container");
      emoteContainers.forEach((container) => {
        const tags = container.dataset.tags.split(" ");
        const matches = tags.some((tag) => tag.startsWith(searchTerm));
        container.style.display = matches ? "block" : "none";
      });
    }

    function createEmoteItem(key, value) {
      const { url, tags } = value;
      const emoteContainer = document.createElement("div");
      emoteContainer.classList.add("emote-container");
      tags.push(key.toLowerCase());
      emoteContainer.dataset.tags = tags.join(" ").toLowerCase();

      const emoteLabel = document.createElement("p");
      emoteLabel.innerText = key;
      emoteLabel.classList.add("emote-label");

      const emoteItem = document.createElement("div");
      emoteItem.classList.add("emote-item");
      emoteItem.style.backgroundImage = `url(${url})`;
      emoteItem.addEventListener(
        "click",
        () => onEmoteClick(value) // pass down the emote object
      );

      emoteContainer.appendChild(emoteItem);
      emoteContainer.appendChild(emoteLabel);
      emoteMenu.appendChild(emoteContainer);
    }
  }

  function createModal() {
    const existingMenu = document.getElementById("emote-menu");
    if (existingMenu) {
      existingMenu.style.display =
        existingMenu.style.display === "none" ? "block" : "none";
      return;
    }

    // Attempt to style the modal dynamically. Not great, but it works.
    const menuLeft =
      pageFlags.isChatbox || pageFlags.isNewTopic ? "60%" : "20%";
    const menuTop = pageFlags.isNewTopic ? "10%" : "20%";
    const modalStyler = `
    .emote-menu {
      position: fixed;
      border-radius: 5px;
      z-index: 1;
      left: ${menuLeft};
      top: ${menuTop};
      max-height: 345px;
      height: 100%;
      overflow: auto;
      background-color: rgba(0,0,0,0.8);
    }
    .emote-content {
      background-color: #1C1C1C;
      color: #CCCCCC;
      margin: 15% auto;
      padding: 20px;
      max-width: 300px;
      width: 300px;
      max-height: 250px;
      height: 250px;
      overflow: auto;
      position: relative;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      grid-template-rows: 40px;
      gap: 10px;
    }
    .emote-label {
      max-width: 40px;
      width: 40px;
      font-size: 8px;
      text-align: center;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .emote-label:hover {
      position: absolute;
      overflow: visible;
      z-index: 9999;
    }
    .emote-container {
      max-width: 50px;
    }
    .emote-item {
      width: 40px;
      height: 40px;
      cursor: pointer;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      transition: transform 0.1s;
    }
    .emote-item:hover {
      transform: scale(1.1);
    }
    .emote-search-bar {
      grid-column: 1 / -1;
      background-color: #333;
      color: #a1a1a1;
      height: 30px;
      border: none;
      border-radius: 3px;
      width: 100%;
      padding: 10px;
      box-sizing: border-box;
    }
    .menu-close, .menu-settings {
      background-color: transparent;
      color: #BBBBBB;
      position: absolute;
      top: 10px;
      padding: 5px;
      border: 0;
      cursor: pointer;
      transition: opacity 0.1s;
    }
    .menu-close:hover, .menu-settings:hover {
      opacity: 0.8;
    }
    .menu-close {
      right: 40px;
    }
    .menu-settings {
      right: 10px;
    }
    .settings-menu {
      background-color: #2C2C2C;
      color: #CCCCCC;
      border-radius: 5px;
      position: absolute;
      top: 50px;
      right: 10px;
      z-index: 2;
      max-height: 260px;
      padding: 20px !important;
      overflow: auto;
      width: 240px;
      flex-direction: column;
      justify-content: center;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    .settings-menu > div {
      margin: 5px 0 !important;
    }
    #img_cb, #autofill_cb, #show_label {
      cursor: pointer !important;
    }
  `;

    addStyle(modalStyler);

    const modal = document.createElement("div");
    modal.className = "emote-menu";
    modal.id = "emote-menu";

    const closeButton = document.createElement("button");
    closeButton.className = "menu-close";
    closeButton.textContent = "Close";
    closeButton.onclick = () => (modal.style.display = "none");

    const settingsButton = document.createElement("button");
    settingsButton.className = "menu-settings";
    settingsButton.textContent = "⚙️";
    settingsButton.onclick = () =>
      (settingsMenu.style.display =
        settingsMenu.style.display === "none" ? "flex" : "none");

    const settingsMenu = document.createElement("div");
    settingsMenu.className = "settings-menu";
    settingsMenu.style.display = "none";
    settingsMenu.innerHTML = `
    <div class="emote__config">
      <label for="autofill_cb">Autofill emote name</label>
      <input type="checkbox" id="autofill_cb">
    </div>
    <div class="emote__config">
      <label for="img_cb">Auto img tag</label>
      <input type="checkbox" id="img_cb">
    </div>
    <div class="emote__config">
      <label for="show_label">Show emote labels</label>
      <input type="checkbox" id="show_label">
    </div>
    <div class="emote__config">
      <label for="sizePref">Select Emote Size:</label>
        <select id="sizePref" name="sizePref">
            <option value="default">Default</option>
            <option value="large">Large</option>
            <option value="small">Small</option>
            <option value="sfa">SFA</option>
        </select>
    </div>
  `;

    settingsMenu
      .querySelector("#autofill_cb")
      .addEventListener("change", (e) => {
        localStorage.setItem("autofill", e.target.checked);
      });

    settingsMenu.querySelector("#img_cb").addEventListener("change", (e) => {
      localStorage.setItem("useImgTag", e.target.checked);
    });

    settingsMenu
      .querySelector("#show_label")
      .addEventListener("change", (e) => {
        localStorage.setItem(
          "showEmoteLabel",
          JSON.stringify(e.target.checked)
        ); // Store as JSON string
        const labels = document.querySelectorAll(".emote-label"); // Select elements with class 'emote-label'
        labels.forEach(
          (label) => (label.style.display = e.target.checked ? "block" : "none")
        ); // Corrected display logic
      });

    modal.appendChild(closeButton);
    modal.appendChild(settingsButton);
    modal.appendChild(settingsMenu);
    modal.appendChild(emoteMenu);
    document.body.appendChild(modal);

    initializeSettings();
  }
  // Load the settings into the menu from local storage.
  function initializeSettings() {
    document.getElementById("autofill_cb").checked = JSON.parse(
      localStorage.getItem("autofill") || "false"
    );
    document.getElementById("img_cb").checked = JSON.parse(
      localStorage.getItem("useImgTag") || "false"
    );
    document.getElementById("show_label").checked = JSON.parse(
      localStorage.getItem("showEmojiLabel") || "false"
    );

    const sizePrefSelect = document.getElementById("sizePref");
    const savedSizePref = localStorage.getItem("sizePref");
    if (savedSizePref) {
      sizePrefSelect.value = savedSizePref;
    }

    sizePrefSelect.addEventListener("change", () => {
      const selectedSizePref = sizePrefSelect.value;
      localStorage.setItem("sizePref", selectedSizePref);
      sizePref = sizePrefSelect.value;
    });
  }

  // Inject the emoji button and run the main script.
  function addEmojiButton() {
    getDOMSelectors();

    if (!menuSelector || !chatForm) {
      setTimeout(addEmojiButton, 1000);
      return;
    }

    const emojiButtonStyler = `
            .emoji-button {
                cursor: pointer;
                font-size: 24px;
                margin-left: 20px;
            }
        `;

    addStyle(emojiButtonStyler);

    const emojiButton = document.createElement("span");
    emojiButton.classList.add("emoji-button");
    emojiButton.innerHTML = "😂";
    emojiButton.addEventListener("click", createModal);

    if (pageFlags.isChatbox || pageFlags.isForum) {
      menuSelector.prepend(emojiButton);
    } else {
      menuSelector.append(emojiButton);
    }

    chatForm.addEventListener("input", (e) => {
      // get settings from local storage
      const autofill = JSON.parse(localStorage.getItem("autofill") || "false");
      const useImgTag = JSON.parse(
        localStorage.getItem("useImgTag") || "false"
      );

      // only handle input changes if the user has these settings enabled
      if (autofill || useImgTag) {
        handleInputChange(e, autofill, useImgTag);
      }
    });
  }
  if (Object.keys(emotes).length === 0 && emotes.constructor === Object) {
    setEmotes();
  }
  // Only call the script on supported pages.
  if (Object.values(pageFlags).some((flag) => flag)) {
    addEmojiButton();
  }
})();
